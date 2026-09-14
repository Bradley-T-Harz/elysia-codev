/** Native installed Core discovery. Never probes TCP ports or trusts workspace settings. */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as crypto from "node:crypto";
import * as http from "node:http";
import { execFile } from "node:child_process";
import { resolveLocalCredentialPath } from "./LocalCredentialProvider";

import { CODEV_PRODUCT_VERSION, CORE_CONTRACT, RUNTIME_CONTRACT } from "./codevContracts";
export { CORE_CONTRACT, RUNTIME_CONTRACT };
const digestCache = new Map<string, string>();

function validateEnvironment(environment: NodeJS.ProcessEnv, home: string): void {
  if (!path.isAbsolute(home)) throw new Error("An absolute user home is required for installed Codev.");
  for (const name of ["XDG_RUNTIME_DIR", "XDG_STATE_HOME", "XDG_DATA_HOME", "XDG_CONFIG_HOME"]) {
    const value = environment[name];
    if (value && !path.isAbsolute(value)) throw new Error("Installed Codev requires absolute XDG directory paths.");
  }
}

export function runtimeDirectory(environment = process.env, home = os.homedir()): string {
  validateEnvironment(environment, home);
  return path.dirname(path.dirname(resolveLocalCredentialPath(environment, home)));
}

function protectedFile(filename: string, owner: number): fs.Stats {
  const info = fs.lstatSync(filename);
  if (!info.isFile() || info.uid !== owner || info.nlink !== 1 || (info.mode & 0o022) !== 0) {
    throw new Error("Codev Core package permissions are unsafe. Repair the installation.");
  }
  return info;
}

function fileDigest(filename: string, owner: number): string {
  const before = protectedFile(filename, owner);
  const key = `${filename}:${before.dev}:${before.ino}:${before.size}:${before.mtimeMs}:${before.ctimeMs}`;
  const cached = digestCache.get(key);
  if (cached) return cached;
  const fd = fs.openSync(filename, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const digest = crypto.createHash("sha256");
    const buffer = Buffer.alloc(1024 * 1024);
    let bytes: number;
    while ((bytes = fs.readSync(fd, buffer)) > 0) digest.update(buffer.subarray(0, bytes));
    const after = protectedFile(filename, owner);
    if (before.ino !== after.ino || before.dev !== after.dev || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs) {
      throw new Error("Codev Core changed during installation verification.");
    }
    const value = digest.digest("hex");
    if (digestCache.size > 8) digestCache.clear();
    digestCache.set(key, value);
    return value;
  } finally { fs.closeSync(fd); }
}

export function installedCore(environment = process.env, home = os.homedir()): string | null {
  validateEnvironment(environment, home);
  if (process.platform !== "linux" || process.arch !== "x64" || typeof process.getuid !== "function") {
    throw new Error("This installed Codev Core adapter requires a qualified amd64 Linux system.");
  }
  const data = environment.XDG_DATA_HOME && path.isAbsolute(environment.XDG_DATA_HOME) ? environment.XDG_DATA_HOME : path.join(home, ".local/share");
  const roots = [path.join(data, "codev/current/usr/lib/codev"), "/usr/lib/codev"];
  for (const [index, root] of roots.entries()) {
    const manifest = path.join(root, "runtime.json");
    let metadata: fs.Stats;
    try { metadata = fs.lstatSync(manifest); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") continue; throw error; }
    const owner = index === 0 ? process.getuid() : 0;
    const actual = fs.realpathSync(root);
    if (index === 0 && !actual.startsWith(fs.realpathSync(path.join(data, "codev/releases")) + path.sep)) {
      throw new Error("Codev Core current release escapes the installed package directory.");
    }
    for (let parent = actual; ; parent = path.dirname(parent)) {
      const info = fs.lstatSync(parent);
      const stickyRoot = info.uid === 0 && (info.mode & 0o1000) !== 0;
      if (!info.isDirectory() || (![0, owner].includes(info.uid)) || ((info.mode & 0o022) !== 0 && !stickyRoot)) {
        throw new Error("Codev Core package parent permissions are unsafe.");
      }
      if (parent === path.dirname(parent)) break;
    }
    protectedFile(manifest, owner);
    if (metadata.size > 16384) throw new Error("Codev Core manifest exceeds its limit.");
    const fd = fs.openSync(manifest, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    let value: Record<string, unknown>;
    try { value = JSON.parse(fs.readFileSync(fd, "utf8")) as Record<string, unknown>; }
    finally { fs.closeSync(fd); }
    const after = protectedFile(manifest, owner);
    if (metadata.ino !== after.ino || metadata.mtimeMs !== after.mtimeMs || metadata.ctimeMs !== after.ctimeMs) throw new Error("Codev Core manifest changed during verification.");
    if (value.product !== "codev-core" || value.version !== CODEV_PRODUCT_VERSION || value.contract !== CORE_CONTRACT || value.runtime_contract !== RUNTIME_CONTRACT || value.architecture !== "amd64") {
      throw new Error(`Install Codev Core ${CODEV_PRODUCT_VERSION} to match this adapter. Workspace trust does not install Core.`);
    }
    const executable = path.join(root, "codev-core");
    fs.accessSync(executable, fs.constants.X_OK);
    if (fileDigest(executable, owner) !== value.core_sha256) throw new Error("Codev Core integrity verification failed. Repair the installed package.");
    return executable;
  }
  return null;
}

/** Keep this handle open until the HTTP response ends: /proc/self/fd resolves
 * the verified directory without Linux's short absolute Unix-path limit. */
export function openRuntimeSocket(): { socketPath: string; close: () => void } {
  const fd = fs.openSync(runtimeDirectory(), fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
  try {
    const info = fs.fstatSync(fd);
    if (!info.isDirectory() || info.uid !== process.getuid?.() || (info.mode & 0o077) !== 0) throw new Error("Unsafe Codev runtime directory.");
    const socketPath = `/proc/self/fd/${fd}/core.sock`;
    const socket = fs.lstatSync(socketPath);
    if (!socket.isSocket() || socket.uid !== process.getuid?.() || (socket.mode & 0o077) !== 0) throw new Error("Unsafe Codev runtime socket.");
    return { socketPath, close: () => fs.closeSync(fd) };
  } catch (error) { fs.closeSync(fd); throw error; }
}

let starting: Promise<void> | null = null;
async function runtimeResponds(expectedDigest?: string): Promise<boolean> {
  let handle: ReturnType<typeof openRuntimeSocket>;
  try { handle = openRuntimeSocket(); } catch { return false; }
  return new Promise(resolve => {
    let done = false;
    const finish = (value: boolean) => { if (!done) { done = true; handle.close(); resolve(value); } };
    const request = http.get({ socketPath: handle.socketPath, path: "/runtime/identity", headers: { Host: "localhost", Connection: "close" }, timeout: 1500 }, response => {
      let raw = "";
      response.on("data", chunk => { raw += String(chunk); if (raw.length > 16384) request.destroy(); });
      response.on("aborted", () => finish(false));
      response.on("error", () => finish(false));
      response.on("end", () => {
        try {
          const identity = JSON.parse(raw) as { contract: string; product_version: string; uid: number; pid: number; transport: string; executable_sha256?: string };
          finish(response.statusCode === 200 && identity.contract === RUNTIME_CONTRACT && identity.product_version === CODEV_PRODUCT_VERSION && identity.uid === process.getuid?.() && identity.pid > 1 && identity.transport === "unix" && (!expectedDigest || identity.executable_sha256 === expectedDigest));
        } catch { finish(false); }
      });
    });
    request.on("timeout", () => request.destroy());
    request.on("error", () => finish(false));
  });
}
export async function ensureInstalledRuntime(): Promise<boolean> {
  // A running Elysia may already own the shared runtime. Its canonical
  // installation endpoint supplies product truth, including absence/degrade.
  let executable: string | null;
  try { executable = installedCore(); }
  catch (error) {
    if (await runtimeResponds()) return true; // Canonical API can explain a degraded package.
    if ((error as NodeJS.ErrnoException).code) throw new Error("Codev Core package files are unavailable or changed. Repair the installed package.");
    throw error;
  }
  if (!executable) return runtimeResponds();
  if (await runtimeResponds(fileDigest(executable, fs.lstatSync(executable).uid))) return true;
  // The fixed packaged command implements the same instance lock used by
  // Desktop. No shell, workspace executable, CLI expression or URL is accepted.
  if (!starting) starting = new Promise<void>((resolve, reject) => {
    const env: NodeJS.ProcessEnv = { ...process.env, PYINSTALLER_RESET_ENVIRONMENT: "1" };
    for (const key of ["PYTHONPATH", "LD_LIBRARY_PATH", "CONDA_PREFIX", "CONDA_DEFAULT_ENV"]) delete env[key];
    execFile(executable, ["runtime", "ensure"], { env, cwd: "/", timeout: 70000, maxBuffer: 16384, windowsHide: true }, (error, stdout) => {
      if (error) { reject(new Error("Codev Core is installed, but its private service could not start. Repair the package or inspect Codev runtime status.")); return; }
      try {
        const identity = JSON.parse(stdout) as { contract: string; state: string; transport: string };
        if (identity.contract !== RUNTIME_CONTRACT || identity.state !== "ready" || identity.transport !== "unix") throw new Error("Installed runtime contract mismatch.");
        resolve();
      } catch { reject(new Error("Codev Core returned incompatible runtime discovery data.")); }
    });
  }).finally(() => { starting = null; });
  await starting;
  return true;
}
