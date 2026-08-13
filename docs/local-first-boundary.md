# Local-First Boundary

Codev is local-first and must default to loopback Elysia only.

Allowed now:

- local bridge status
- session creation
- planning chat
- metadata-only repo preview
- archive type/risk truth through Elysia core
- exact-approved selected archive extraction into an Elysia-owned non-project disposable sandbox
- database identification and static metadata through Elysia core
- exact-approved SQLite/DuckDB schema counts and private artifact receipts from Elysia's read-only snapshot workflow
- bounded static PE/ELF/CLASS/WASM/unknown-BIN metadata and risk summaries through Elysia core
- bounded STL/OBJ/DAE, STEP/IGES/DXF, URDF/SDF, G-code, BLEND, and F3D/F3Z engineering inspection through Elysia EngineeringForge
- exact-approved local SVG preview for supported STL/OBJ/DXF/G-code files, with source-hash staleness checks
- private EngineeringForge report, manifest, plan, receipt, and derivative artifact receipts

Not allowed in Codev itself:

- cloud upload
- Marketplace account requirement
- direct shell/process execution
- direct file mutation
- direct archive parsing, extraction, install, execution, activation, or project merge
- autonomous workspace scanning
- autonomous archive extraction
- direct database parsing, SQL, row preview, export, extension loading, or mutation
- direct binary parsing, execution, loading, import, install, linking, trust, mutation, patching, or decompilation
- direct geometry, CAD, robot-model, CAM, Blender, or Fusion parsing
- machine send, printing, CNC/controller/serial access, robot actuation, ROS/Gazebo launch, Blender script/plugin execution, or Fusion/cloud upload
- engineering-file repair, conversion, mutation, overwrite, or safety/manufacturing certification

Codev remains a client. It cannot convert database schema approval into query/mutation authority, binary static-inspection authority into runtime authority, or an EngineeringForge preview approval into execution, conversion, mutation, simulation, or physical-output authority. Detailed reports remain local Elysia artifacts; Codev displays receipts, compact results, capability/risk truth, and sanitized audit IDs.
