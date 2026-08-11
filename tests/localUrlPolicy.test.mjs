import assert from "node:assert/strict";
import test from "node:test";
import policy from "../out/src/localUrlPolicy.js";

const { buildLoopbackUrl } = policy;

test("normalizes localhost and retains the requested local route", () => {
  assert.equal(buildLoopbackUrl("http://localhost:8000", "/coding/status").toString(), "http://127.0.0.1:8000/coding/status");
});

test("rejects non-loopback and non-http bridge URLs", () => {
  assert.throws(() => buildLoopbackUrl("https://example.com", "/coding/status"), /non-loopback/);
  assert.throws(() => buildLoopbackUrl("file:///tmp/socket", "/coding/status"), /scheme/);
});
