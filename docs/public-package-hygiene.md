# Codev Public Package Hygiene

Codev is the official Elysia Developer-profile candidate, currently at `0.1.0` during v1 finalization. Packaging a VSIX does not install, publish, upload, or grant authority.

The local package boundary is enforced by `.vscodeignore` and `scripts/verify-vsix-hygiene.mjs`. A reviewed VSIX must contain compiled extension/webview output, package metadata, license, public documentation, and approved media only. It must not contain TypeScript source, tests, source maps, dependency trees, scripts, `.env` files, credentials, private keys, databases, logs, raw workspace paths, or operator-specific home paths.

Codev has no configured Git remote at Pass 9. That is a deliberate pre-publication state, not an instruction to publish. A repository URL must not be invented in package metadata. First publication requires the Pass 10 Extension Host proof, exact VSIX inspection, explicit remote/Marketplace decision, and the operator approval.

Codev remains local-first and bounded: no hidden shell, package installation, Git mutation/push, broad repository ingestion, cloud upload, or unbounded autonomy. Local Elysia is the final authority for repository approval, exact mutations, commands, and receipts.
