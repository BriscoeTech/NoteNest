import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { loadAppVersion } from "@/lib/app-version";

loadAppVersion().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
