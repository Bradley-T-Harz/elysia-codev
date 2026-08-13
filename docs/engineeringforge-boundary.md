# EngineeringForge in Codev

Codev is a presentation and approval client for Elysia EngineeringForge. It does not parse CAD, mesh, robot-model, G-code, BLEND, or Fusion files itself.

When the active selected file is a registered engineering format, the EngineeringForge panel can request Elysia inspection and display format/family, source hash and size, capability ladder truth, risks, static report summaries, external-reference classification, private artifact receipts, and stale-file status. The panel groups truth under Geometry, CAD, Robot Model, CAM / G-code, Blend, or Fusion limited.

For STL, OBJ, DXF, and G-code, Codev can ask Elysia for a preview plan and issue an exact one-time approval for the matching source hash and plan hash. Apply creates only a local Elysia artifact. Changing the active file or its preview hash clears the prior EngineeringForge state.

The panel intentionally has no Run, Execute, Machine, Print, Send, controller, robot, ROS/Gazebo, Blender-script, Fusion-upload, Patch, Overwrite, or Trust-as-safe control. Engineering files also suppress the general mutation controls. Conversion, repair, and simulation controls are absent because this Chunk does not expose truthful apply workflows for them.
