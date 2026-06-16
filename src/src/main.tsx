import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { loadBuildInfo } from "@/lib/build-info";

loadBuildInfo().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
