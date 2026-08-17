# Release Process

1. Run `npm run test:unit`.
2. Run `npm run compile`.
3. Package locally with `npm run vscode:package -- --out /tmp/elysia-codev-review.vsix`.
4. Run `npm run verify:package -- /tmp/elysia-codev-review.vsix`; it inspects the VSIX without extracting it and fails on private paths, credentials, source, tests, maps, dependency trees, environment files, databases, or logs.
5. Dry-run the Elysia Developer-profile installer against that exact VSIX.
6. Verify trusted/untrusted, authenticated/unauthenticated, approve/revoke, native diff, patch, check, checkpoint/stop, and reload behavior in an Extension Development Host using a disposable workspace.
7. Confirm no risky execution authority was added and do not publish without explicit approval.

Do not run `npm install` or dependency-mutating commands as part of routine verification unless dependency changes are intentional.

See `docs/public-package-hygiene.md` for the public boundary and pre-publication state.
