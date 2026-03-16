import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, color: "#FF3B3B", background: "#0B0F1A", minHeight: "100vh", fontFamily: "monospace" }}>
          <h2>Something crashed</h2>
          <pre style={{ marginTop: 12, fontSize: 12, color: "#E6EDF3", whiteSpace: "pre-wrap" }}>
            {this.state.error?.toString()}
            {"\n"}
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
