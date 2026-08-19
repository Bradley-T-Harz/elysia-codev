# Release Process

1. Run `npm run test:unit`.
2. Run `npm run compile`.
3. Package locally with `npm run vscode:package -- --out /tmp/elysia-codev-review.vsix`.
4. Run `npm run verify:package -- /tmp/elysia-codev-review.vsix`; it inspects the VSIX without extracting it and fails on private paths, credentials, source, tests, maps, dependency trees, environment files, databases, or logs.
5. Dry-run the Elysia Developer-profile installer against that exact VSIX.
6. Install the exact reviewed VSIX into a clean VS Code user-data and extensions directory. Verify trusted/untrusted, authenticated/unauthenticated, approve/revoke, native diff, patch, file operations, check, checkpoint/stop, reload, uninstall, and reinstall behavior against packaged Elysia and a disposable repository. Extension Development Host success is supplemental and is not release proof.
7. Confirm no risky execution authority was added and do not publish without explicit approval.

Do not run `npm install` or dependency-mutating commands as part of routine verification unless dependency changes are intentional.

See `docs/public-package-hygiene.md` for the public boundary and pre-publication state.
