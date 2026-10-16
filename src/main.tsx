import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { LocaleProvider } from "./i18n";
import "./styles/fonts.css";
import "./styles/tokens.css";
import "./styles/global.css";
import "./styles/motion.css";
import "./components/primitives/primitives.css";

const rootElement = document.getElementById("root");
if (rootElement === null) {
  throw new Error("Root element #root is missing from index.html");
}

createRoot(rootElement).render(
  <LocaleProvider>
    <StrictMode>
      <App />
    </StrictMode>
  </LocaleProvider>,
);
