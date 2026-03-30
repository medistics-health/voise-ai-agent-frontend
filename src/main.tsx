import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { AuthProvider } from "./lib/auth-context";
import { Toaster } from "react-hot-toast";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#0f1629",
              color: "#e2e8f0",
              border: "1px solid rgba(255,255,255,0.1)",
            },
          }}
        />
    </AuthProvider>
  </React.StrictMode>,
);
