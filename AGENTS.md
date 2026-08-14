# Agent notes

- Prefer `pnpm desktop:dev` for local work. Do **not** run `pnpm desktop:build` for releases.
- Releases are produced by `.github/workflows/release.yml` on `v*` tags.
- UI must not call Tauri APIs directly; go through `src/infrastructure/adapters`.
- Agent runtime installs under the app data `agent-prefix` directory via npm.
- The desktop shell does **not** auto-update; only the agent (`@deepseek-ai/dsh`) does.
