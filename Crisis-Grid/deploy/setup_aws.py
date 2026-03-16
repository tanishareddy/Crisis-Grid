"""
Crisis Grid — AWS Infrastructure Setup
Creates: DynamoDB table, SNS topic, Lambda function, API Gateway
Run once: python deploy/setup_aws.py
"""
import boto3
import json
import zipfile
import os
import time
import secrets

REGION      = "us-east-1"
BUCKET      = "crisis-grid-data"
FAULT_TABLE = "crisis-grid-faults"
LAMBDA_NAME = "crisis-grid-bedrock"
API_NAME    = "crisis-grid-api"

iam      = boto3.client("iam",      region_name=REGION)
dynamodb = boto3.client("dynamodb", region_name=REGION)
sns      = boto3.client("sns",      region_name=REGION)
lam      = boto3.client("lambda",   region_name=REGION)
apigw    = boto3.client("apigatewayv2", region_name=REGION)
s3       = boto3.client("s3",       region_name=REGION)


def create_s3_bucket():
    print("Setting up S3...")
    try:
        s3.head_bucket(Bucket=BUCKET)
        print(f"  S3 bucket {BUCKET} already exists")
    except Exception:
        s3.create_bucket(Bucket=BUCKET)
        print(f"  Created S3 bucket: {BUCKET}")


def create_dynamodb_table():
    print("Setting up DynamoDB...")
    try:
        dynamodb.describe_table(TableName=FAULT_TABLE)
        print(f"  Table {FAULT_TABLE} already exists")
        return
    except dynamodb.exceptions.ResourceNotFoundException:
        pass

    dynamodb.create_table(
        TableName=FAULT_TABLE,
        KeySchema=[
            {"AttributeName": "substation_id", "KeyType": "HASH"},
            {"AttributeName": "fault_id",      "KeyType": "RANGE"},
        ],
        AttributeDefinitions=[
            {"AttributeName": "substation_id", "AttributeType": "S"},
            {"AttributeName": "fault_id",      "AttributeType": "S"},
        ],
        BillingMode="PAY_PER_REQUEST",
    )
    print(f"  Created DynamoDB table: {FAULT_TABLE}")
    waiter = boto3.client("dynamodb", region_name=REGION).get_waiter("table_exists")
    waiter.wait(TableName=FAULT_TABLE)
    # TTL must be set separately after table is active
    boto3.client("dynamodb", region_name=REGION).update_time_to_live(
        TableName=FAULT_TABLE,
        TimeToLiveSpecification={"Enabled": True, "AttributeName": "ttl"}
    )
    print(f"  Table active with TTL enabled.")


def create_sns_topic():
    print("Setting up SNS...")
    resp = sns.create_topic(Name="crisis-grid-alerts")
    arn  = resp["TopicArn"]
    print(f"  SNS topic ARN: {arn}")
    return arn


def create_lambda_role():
    print("Setting up IAM role for Lambda...")
    role_name = "crisis-grid-lambda-role"
    trust = json.dumps({
        "Version": "2012-10-17",
        "Statement": [{
            "Effect": "Allow",
            "Principal": {"Service": "lambda.amazonaws.com"},
            "Action": "sts:AssumeRole"
        }]
    })
    try:
        role = iam.get_role(RoleName=role_name)
        role_arn = role["Role"]["Arn"]
        print(f"  Role already exists: {role_arn}")
    except iam.exceptions.NoSuchEntityException:
        role = iam.create_role(RoleName=role_name, AssumeRolePolicyDocument=trust)
        role_arn = role["Role"]["Arn"]
        # attach policies
        for policy in [
            "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
            "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess",
            "arn:aws:iam::aws:policy/AmazonBedrockFullAccess",
            "arn:aws:iam::aws:policy/AmazonSNSFullAccess",
            "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess",
        ]:
            iam.attach_role_policy(RoleName=role_name, PolicyArn=policy)
        print(f"  Created role: {role_arn}")
        print("  Waiting 15s for role propagation...")
        time.sleep(15)
    return role_arn


def package_lambda(sns_arn):
    print("Packaging Lambda...")
    # resolve path relative to this script's location
    script_dir = os.path.dirname(os.path.abspath(__file__))
    handler_path = os.path.join(script_dir, "..", "lambda", "bedrock_handler.py")
    zip_path = os.path.join(script_dir, "lambda_package.zip")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.write(handler_path, "lambda_function.py")
    print(f"  Packaged: {zip_path}")
    return zip_path


def wait_for_lambda(name):
    """Wait until Lambda is no longer in a pending/updating state"""
    print("  Waiting for Lambda to be ready...")
    for _ in range(20):
        resp = lam.get_function_configuration(FunctionName=name)
        state = resp.get("LastUpdateStatus", "Successful")
        if state in ("Successful", "Failed") and resp.get("State") == "Active":
            return
        time.sleep(3)

def deploy_lambda(role_arn, sns_arn, zip_path, api_key, allowed_origin):
    print("Deploying Lambda...")
    with open(zip_path, "rb") as f:
        code = f.read()

    env = {
        "Variables": {
            "FAULT_TABLE":    FAULT_TABLE,
            "SNS_TOPIC_ARN":  sns_arn,
            "API_KEY":        api_key,
            "ALLOWED_ORIGIN": allowed_origin,
        }
    }

    try:
        lam.get_function(FunctionName=LAMBDA_NAME)
        wait_for_lambda(LAMBDA_NAME)
        lam.update_function_code(FunctionName=LAMBDA_NAME, ZipFile=code)
        wait_for_lambda(LAMBDA_NAME)
        lam.update_function_configuration(FunctionName=LAMBDA_NAME, Environment=env)        wait_for_lambda(LAMBDA_NAME)
        print(f"  Updated Lambda: {LAMBDA_NAME}")
    except lam.exceptions.ResourceNotFoundException:
        lam.create_function(
            FunctionName=LAMBDA_NAME,
            Runtime="python3.12",
            Role=role_arn,
            Handler="lambda_function.lambda_handler",
            Code={"ZipFile": code},
            Timeout=30,
            MemorySize=256,
            Environment=env,
        )
        wait_for_lambda(LAMBDA_NAME)
        print(f"  Created Lambda: {LAMBDA_NAME}")

    # get ARN
    fn = lam.get_function(FunctionName=LAMBDA_NAME)
    return fn["Configuration"]["FunctionArn"]


def create_api_gateway(lambda_arn, allowed_origin):
    print("Setting up API Gateway...")
    # check if exists
    apis = apigw.get_apis()
    for api in apis.get("Items", []):
        if api["Name"] == API_NAME:
            url = f"https://{api['ApiId']}.execute-api.{REGION}.amazonaws.com"
            print(f"  API already exists: {url}")
            return url

    api = apigw.create_api(
        Name=API_NAME,
        ProtocolType="HTTP",
        CorsConfiguration={
            "AllowOrigins": [allowed_origin],
            "AllowMethods": ["POST", "OPTIONS"],
            "AllowHeaders": ["Content-Type", "x-api-key"],
        },
    )
    api_id = api["ApiId"]

    # integration
    integ = apigw.create_integration(
        ApiId=api_id,
        IntegrationType="AWS_PROXY",
        IntegrationUri=lambda_arn,
        PayloadFormatVersion="2.0",
    )

    # route
    apigw.create_route(
        ApiId=api_id,
        RouteKey="POST /analyze",
        Target=f"integrations/{integ['IntegrationId']}",
    )

    # stage
    apigw.create_stage(ApiId=api_id, StageName="$default", AutoDeploy=True)

    # Lambda permission
    account_id = boto3.client("sts").get_caller_identity()["Account"]
    lam.add_permission(
        FunctionName=LAMBDA_NAME,
        StatementId="api-gateway-invoke",
        Action="lambda:InvokeFunction",
        Principal="apigateway.amazonaws.com",
        SourceArn=f"arn:aws:execute-api:{REGION}:{account_id}:{api_id}/*/*/analyze",
    )

    url = f"https://{api_id}.execute-api.{REGION}.amazonaws.com"
    print(f"  API Gateway URL: {url}/analyze")
    return url


def save_config(api_url, sns_arn, api_key):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # aws_config.json is gitignored — safe to store ARNs here for local reference
    config = {"api_url": f"{api_url}", "sns_arn": sns_arn, "region": REGION}
    config_path = os.path.join(script_dir, "aws_config.json")
    with open(config_path, "w") as f:
        json.dump(config, f, indent=2)
    env_path = os.path.join(script_dir, "..", "dashboard", ".env")
    with open(env_path, "w") as f:
        f.write(f"VITE_API_URL={api_url}\n")
        f.write(f"VITE_AWS_REGION={REGION}\n")
        f.write(f"VITE_API_KEY={api_key}\n")
    print(f"\n  Config saved. API URL: {api_url}")
    print(f"  API key written to dashboard/.env (keep this secret)")


if __name__ == "__main__":
    print("=== Crisis Grid AWS Setup ===\n")

    # Prompt for the frontend origin so CORS is locked to the real domain
    allowed_origin = input("Enter your frontend origin for CORS (e.g. https://myapp.com) [default: http://localhost:5173]: ").strip()
    if not allowed_origin:
        allowed_origin = "http://localhost:5173"

    # Generate a cryptographically secure API key
    api_key = secrets.token_hex(32)
    print(f"\n  Generated API key (stored in dashboard/.env and Lambda env vars)")

    create_s3_bucket()
    create_dynamodb_table()
    sns_arn    = create_sns_topic()
    role_arn   = create_lambda_role()
    zip_path   = package_lambda(sns_arn)
    lambda_arn = deploy_lambda(role_arn, sns_arn, zip_path, api_key, allowed_origin)
    api_url    = create_api_gateway(lambda_arn, allowed_origin)
    save_config(api_url, sns_arn, api_key)
    print("\n=== Setup Complete ===")
    print(f"API endpoint: {api_url}/analyze")
    print("Run: cd dashboard && npm run dev")
