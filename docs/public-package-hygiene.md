# Codev Public Package Hygiene

Codev is the official Elysia Developer-profile `1.0.0` release candidate. Packaging a VSIX does not install, publish, upload, or grant authority.

The local package boundary is enforced by `.vscodeignore` and `scripts/verify-vsix-hygiene.mjs`. A reviewed VSIX must contain compiled extension/webview output, package metadata, license, public documentation, and approved media only. It must not contain TypeScript source, tests, source maps, dependency trees, scripts, `.env` files, credentials, private keys, databases, logs, raw workspace paths, or operator-specific home paths.

The canonical repository is the real empty private staging destination at `https://github.com/Bradley-T-Harz/elysia-codev`. Package metadata names that exact future public source and issue destination. No source, tag, release, or artifact has been uploaded there; visibility and publication remain reserved to later release-owner authorization.

Codev remains local-first and bounded: no hidden shell, package installation, Git mutation/push, broad repository ingestion, cloud upload, or unbounded autonomy. Local Elysia is the final authority for repository approval, exact mutations, commands, and receipts.
