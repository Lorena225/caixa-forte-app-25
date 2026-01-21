import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initWebVitals } from "./lib/webVitals";
import { setupGlobalErrorHandlers } from "./lib/monitoring";

// Initialize performance monitoring
initWebVitals();

// Setup global error handlers for unhandled errors
setupGlobalErrorHandlers();

createRoot(document.getElementById("root")!).render(<App />);
