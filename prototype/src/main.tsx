import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-500.css";
import "@fontsource/ibm-plex-sans/latin-600.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-600.css";
import "./styles.css";
import { DemoStoreProvider } from "./store/DemoStore";
import { AppRouterProvider } from "./lib/router";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DemoStoreProvider>
      <AppRouterProvider>
        <App />
      </AppRouterProvider>
    </DemoStoreProvider>
  </React.StrictMode>,
);
