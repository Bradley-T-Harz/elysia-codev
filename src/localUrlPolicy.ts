export function buildLoopbackUrl(apiUrl: string, path: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(apiUrl.replace(/\/$/, ""));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid Elysia API URL "${apiUrl}": ${detail}`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Rejected Elysia API URL scheme "${parsed.protocol}". Only http/https loopback URLs are allowed.`);
  }
  if (parsed.hostname === "localhost") parsed.hostname = "127.0.0.1";
  if (parsed.hostname !== "127.0.0.1" && parsed.hostname !== "::1" && parsed.hostname !== "[::1]") {
    throw new Error(`Rejected non-loopback Elysia API host "${parsed.hostname}". Use http://127.0.0.1:<port>.`);
  }
  return new URL(path, parsed.toString().replace(/\/$/, "/"));
}
