import { rmSync } from "node:fs";
for (const path of ["out", "dist"]) {
  rmSync(path, { recursive: true, force: true });
}
