import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync, symlinkSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import test from 'node:test';
import discovery from '../out/src/RuntimeDiscovery.js';

const { installedCore, runtimeDirectory, CORE_CONTRACT, RUNTIME_CONTRACT } = discovery;

test('Codev Core installation is independent of VS Code profiles and workspace trust', () => {
  const root = mkdtempSync(join(tmpdir(), 'codev-neutral-package-'));
  chmodSync(root, 0o700);
  const data = join(root, 'user with spaces', 'data');
  const payload = join(data, 'codev/releases/0123456789abcdef/usr/lib/codev');
  mkdirSync(payload, { recursive: true, mode: 0o700 });
  const executable = join(payload, 'codev-core');
  writeFileSync(executable, 'identity-only fixture, never executed', { mode: 0o700 });
  const manifest = { product: 'codev-core', version: '1.1.0', contract: CORE_CONTRACT, runtime_contract: RUNTIME_CONTRACT,
    architecture: 'amd64', core_sha256: createHash('sha256').update(readFileSync(executable)).digest('hex'), adapter_sha256: 'a'.repeat(64) };
  const manifestPath = join(payload, 'runtime.json');
  writeFileSync(manifestPath, JSON.stringify(manifest), { mode: 0o600 });
  symlinkSync('releases/0123456789abcdef', join(data, 'codev/current'));
  try {
    const env = { XDG_DATA_HOME: data };
    assert.equal(installedCore(env, join(root, 'user with spaces')), join(data, 'codev/current/usr/lib/codev/codev-core'));
    writeFileSync(manifestPath, JSON.stringify({ ...manifest, version: '1.0.0' }));
    assert.throws(() => installedCore(env, root), /Install Codev Core 1\.1\.0/);
    writeFileSync(manifestPath, JSON.stringify(manifest));
    // No extension installation, profile directory, repository or editor executable exists.
    chmodSync(manifestPath, 0o666);
    assert.throws(() => installedCore(env, root), /permissions/);
    chmodSync(manifestPath, 0o600);
    writeFileSync(executable, 'damaged Core');
    assert.throws(() => installedCore(env, root), /integrity/);
    writeFileSync(manifestPath, JSON.stringify({ ...manifest, version: '2.0.0' }));
    assert.throws(() => installedCore(env, root), /Install Codev Core 1\.1\.0/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('native transport resolves the same XDG runtime and state fallback as Core', () => {
  assert.equal(runtimeDirectory({ XDG_RUNTIME_DIR: '/run/user/2345' }, '/home/river'), '/run/user/2345/elysia');
  assert.equal(runtimeDirectory({ XDG_STATE_HOME: '/private/state' }, '/home/river'), '/private/state/elysia/runtime');
  assert.equal(runtimeDirectory({}, '/home/river'), '/home/river/.local/state/elysia/runtime');
  assert.throws(() => runtimeDirectory({ XDG_RUNTIME_DIR: 'relative/runtime' }, '/home/river'), /absolute XDG/);
  assert.throws(() => installedCore({ XDG_DATA_HOME: 'relative/data' }, '/home/river'), /absolute XDG/);
});
