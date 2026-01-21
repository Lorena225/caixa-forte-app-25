import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Render the app first, then initialize monitoring
// This prevents issues with React hooks being called before React is ready
const root = createRoot(document.getElementById("root")!);
root.render(<App />);

// Initialize monitoring after React is mounted
// Using requestIdleCallback or setTimeout to defer non-critical initialization
if (typeof window !== 'undefined') {
  const initMonitoring = async () => {
    try {
      const { initWebVitals } = await import("./lib/webVitals");
      const { setupGlobalErrorHandlers } = await import("./lib/monitoring");
      
      initWebVitals();
      setupGlobalErrorHandlers();
    } catch (e) {
      console.warn('Monitoring initialization failed:', e);
    }
  };

  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => initMonitoring());
  } else {
    setTimeout(() => initMonitoring(), 100);
  }
}
