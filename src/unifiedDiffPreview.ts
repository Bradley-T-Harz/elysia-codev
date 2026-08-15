export function applyUnifiedDiffPreview(original: string, diffText: string): string {
  const originalLines = original.split(/(?<=\n)/);
  const diffLines = diffText.split(/(?<=\n)/);
  const result: string[] = [];
  let originalIndex = 0;
  let diffIndex = 0;
  while (diffIndex < diffLines.length) {
    const line = diffLines[diffIndex];
    if (line.startsWith("--- ") || line.startsWith("+++ ")) { diffIndex += 1; continue; }
    if (!line.startsWith("@@")) { diffIndex += 1; continue; }
    const oldSpec = line.split(" ")[1];
    const oldStart = Number.parseInt(oldSpec?.split(",")[0]?.replace("-", "") ?? "", 10);
    if (!Number.isFinite(oldStart)) throw new Error("Invalid unified diff header.");
    const hunkStart = Math.max(oldStart - 1, 0);
    result.push(...originalLines.slice(originalIndex, hunkStart));
    originalIndex = hunkStart;
    diffIndex += 1;
    while (diffIndex < diffLines.length && !diffLines[diffIndex].startsWith("@@")) {
      const hunk = diffLines[diffIndex];
      if (hunk.startsWith(" ")) {
        if (originalLines[originalIndex] !== hunk.slice(1)) throw new Error("Patch context does not match the approved preview.");
        result.push(hunk.slice(1)); originalIndex += 1;
      } else if (hunk.startsWith("-")) {
        if (originalLines[originalIndex] !== hunk.slice(1)) throw new Error("Patch removal does not match the approved preview.");
        originalIndex += 1;
      } else if (hunk.startsWith("+")) result.push(hunk.slice(1));
      else if (!hunk.startsWith("\\")) throw new Error("Invalid unified diff line.");
      diffIndex += 1;
    }
  }
  result.push(...originalLines.slice(originalIndex));
  return result.join("");
}
