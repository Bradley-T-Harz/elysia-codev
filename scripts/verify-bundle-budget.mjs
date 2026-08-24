import { readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";

const outputDirectory = resolve("dist");
const webviewBundle = resolve(outputDirectory, "webview.js");
const maximumBytes = 512 * 1024;
const size = (await stat(webviewBundle)).size;
const entries = await readdir(outputDirectory);

if (entries.some((entry) => entry.endsWith(".map"))) {
  throw new Error("Codev production webview output contains a source map.");
}
if (size > maximumBytes) {
  throw new Error(`Codev webview bundle is ${size} bytes; budget is ${maximumBytes} bytes.`);
}

console.log(`Codev bundle budget passed: dist/webview.js is ${size} bytes (limit ${maximumBytes}).`);
