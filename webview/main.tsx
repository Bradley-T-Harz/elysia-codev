import * as React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import type { VsCodeApi } from "./types";

declare function acquireVsCodeApi(): VsCodeApi;

const vscode = acquireVsCodeApi();
const root = document.getElementById("root");
if (!root) {
  throw new Error("Elysia webview root was not found.");
}

createRoot(root).render(<App vscode={vscode} />);
