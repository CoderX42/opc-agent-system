# OPC Agent Pixel Asset Generator

This package generates a complete pixel-art asset pack for OPC Agent System.

Run from the repository root:

```bash
pnpm generate-assets
```

The pipeline supports GPT Image API, Flux, and SDXL. It also includes a deterministic local pixel renderer, so the command always produces a usable pack even without API keys.

Generated output:

- `characters/` character spritesheets and sliced frames
- `rooms/` office room tiles
- `furniture/` desks, chairs, monitors, cabinets
- `ui/` HUD icons and UI controls
- `effects/` status and productivity effects
- `generated/` manifest, raw provider images, slices, ZIP pack, Aseprite command plan

Use `.env.example` as the template for remote providers.
