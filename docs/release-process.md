# Release Process

1. Run `npm run compile`.
2. Run `npm run check`.
3. Verify the Extension Development Host opens the Elysia Activity Bar and Coding Room.
4. Confirm no risky execution authority was added.
5. Package a VSIX only after review.

Do not run `npm install` or dependency-mutating commands as part of routine verification unless dependency changes are intentional.
