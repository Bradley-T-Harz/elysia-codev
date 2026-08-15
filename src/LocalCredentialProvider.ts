import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

export type LocalCredentialStatus = "available" | "missing" | "invalid" | "unsafe_permissions";

export type LocalCredentialResult = {
  status: LocalCredentialStatus;
  credential?: string;
  storageLabel: "XDG private runtime credential";
};

export function resolveLocalCredentialPath(environment: NodeJS.ProcessEnv = process.env, home = os.homedir()): string {
  const runtimeBase = environment.XDG_RUNTIME_DIR?.trim();
  if (runtimeBase && path.isAbsolute(runtimeBase)) {
    return path.join(runtimeBase, "elysia", "auth", "local-api.credential");
  }
  const stateBase = environment.XDG_STATE_HOME?.trim();
  const resolvedState = stateBase && path.isAbsolute(stateBase) ? stateBase : path.join(home, ".local", "state");
  return path.join(resolvedState, "elysia", "runtime", "auth", "local-api.credential");
}

export class LocalCredentialProvider {
  public read(): LocalCredentialResult {
    const credentialPath = resolveLocalCredentialPath();
    let descriptor: number | undefined;
    try {
      descriptor = fs.openSync(credentialPath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
      const metadata = fs.fstatSync(descriptor);
      if (!metadata.isFile()) {
        return { status: "invalid", storageLabel: "XDG private runtime credential" };
      }
      if ((metadata.mode & 0o077) !== 0) {
        return { status: "unsafe_permissions", storageLabel: "XDG private runtime credential" };
      }
      if (typeof process.getuid === "function" && metadata.uid !== process.getuid()) {
        return { status: "unsafe_permissions", storageLabel: "XDG private runtime credential" };
      }
      const credential = fs.readFileSync(descriptor, "utf-8").trim();
      if (credential.length < 32 || credential.length > 512 || /\s/.test(credential)) {
        return { status: "invalid", storageLabel: "XDG private runtime credential" };
      }
      return { status: "available", credential, storageLabel: "XDG private runtime credential" };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      return {
        status: code === "ENOENT" ? "missing" : code === "ELOOP" ? "invalid" : "invalid",
        storageLabel: "XDG private runtime credential"
      };
    } finally {
      if (descriptor !== undefined) fs.closeSync(descriptor);
    }
  }

  public publicStatus(): Omit<LocalCredentialResult, "credential"> {
    const { status, storageLabel } = this.read();
    return { status, storageLabel };
  }
}
