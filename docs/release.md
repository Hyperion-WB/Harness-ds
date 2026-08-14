# Release

## Local vs CI

| Action | Where |
|---|---|
| `pnpm desktop:dev` | Local (iterate UI / host) |
| `pnpm desktop:build` / installer | **GitHub Actions only** |

The desktop shell itself is **not** auto-updated. Users install a new shell build from GitHub Releases when you publish a tag. Agent (`@deepseek-ai/dsh`) updates live inside Settings.

## Trigger

- Push tag `v*`, or
- Manual `workflow_dispatch` on `.github/workflows/release.yml`

Matrix: macOS aarch64, macOS x86_64, Ubuntu 22.04, Windows.

## Agent updates

Independent of shell releases. The host installs `@deepseek-ai/dsh` into:

- Windows: `%LOCALAPPDATA%/deepseek-harness-gui/agent-prefix`
- macOS/Linux: platform data-local dir under `deepseek-harness-gui/agent-prefix`

Settings control channel (`latest` or pinned semver), auto-update (every 6h), and manual update.
