# Codev 1.1.0 coordinated release candidate

Codev Core supplies one local development runtime for the Elysia workroom,
VS Code adapter, and explicitly paired website clients. Source and adapter
metadata are prepared for 1.1.0. This document does not assert publication or
final package qualification; exact availability belongs to GitHub Releases.

Install the Codev Core Debian package independently of VS Code. The package
contains the matching optional adapter. Use `codev codev-adapter --editor code`
with an explicitly selected profile when desired; do not replace an active
controller profile during installation tests. A VSIX alone is not Core.

The supported coordinated family is Elysia 1.1.0 + Core 1.1.0 + adapter 1.1.0.
Older or unknown Core versions receive upgrade guidance. The local API stays
1.0.0 and coding protocol stays vscode-coding-agent-contract-0.1. Website
protocol support retains the previously qualified 1.0.0 Core and adds 1.1.0.

Installation starts with no workspace, command, network, or website authority.
Workspace trust and exact grants remain separate. Website Sync requires sign-in,
explicit native confirmation, and refresh; pairing shares no files. Changing
installation identity invalidates prior sessions rather than reviving grants.

Final Debian 13 / Ubuntu 24.04 amd64 artifact install and upgrade checks, offline
publisher signing, and public-byte verification must pass before stable release.
No ARM, Wayland, or registry publication is newly claimed. Original 1.0.0 release
assets and source history are preserved. Core provenance must identify its
Elysia source commit separately from this adapter repository's commit.
