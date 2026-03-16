/**
 * Global app context — toasts, notifications
 * Toasts support an optional onClick callback for navigation.
 */
import { createContext, useContext, useState, useCallback, useRef } from "react";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  /**
   * @param {string} message
   * @param {"info"|"success"|"warning"|"error"} type
   * @param {number} duration  ms, 0 = persistent
   * @param {Function|null} onClick  optional click handler (e.g. navigate to incident)
   */
  const addToast = useCallback((message, type = "info", duration = 4000, onClick = null) => {
    const id = ++idRef.current;
    setToasts(prev => [...prev.slice(-4), { id, message, type, onClick }]);
    if (duration > 0) {
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <AppContext.Provider value={{ addToast, removeToast, toasts }}>
      {children}
    </AppContext.Provider>
  );
}

export const useToast = () => useContext(AppContext);
