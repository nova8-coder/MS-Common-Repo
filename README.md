# MS-Common-Repo

This repository contains the LiftIQ and AssetIQ Notifications applications under one Git history. `AssetIQ-Notifications/` is a regular project directory in this repository.

## Applications

- `LiftiQ/` — LiftIQ application and supporting material.
- `AssetIQ-Notifications/` — React and Vite notifications application.
- `docs/` — shared architecture, audit, and project documentation.

Each application keeps its own package manifest and lockfile. Install dependencies and run development commands from the relevant application's directory. Generated dependencies and build output for AssetIQ Notifications are excluded by the root `.gitignore`; its source, documentation, configuration, and lockfile remain available to Git.
