# DeepSeek Harness GUI

[English](README.md) | 中文

基于 [bobleer/deepseek-harness-gui](https://github.com/bobleer/deepseek-harness-gui) / [BitFun](https://github.com/GCWing/BitFun) 的 Tauri 2 桌面壳，会话区复用官方 [`dsh web`](https://github.com/deepseek-ai/deepseek-harness)。

## 功能

- 系统托盘、关到托盘、单实例、窗口位置记忆
- 工作区选择与最近列表；自动拉起本地 `dsh web`
- Agent（`@deepseek-ai/dsh`）通过本地 npm 前缀更新（**壳本身不自更新**）
- 开机自启、全局快捷键 `Ctrl+Shift+H` 显示/隐藏
- 环境探测（doctor）、设置页手动/自动更新 Agent

## 环境

- Node.js `^22.19 || >=24`
- pnpm 10+
- Rust（仅本地 `pnpm desktop:dev` 需要）
- DeepSeek API Key

**本地不要执行 release 打包。** 安装包由 GitHub Actions 在打 tag 后自动构建。

## 开发

```sh
pnpm install
pnpm desktop:dev
```

其它：

```sh
pnpm test
pnpm typecheck
pnpm test:smoke
```

## 发布（仅 CI）

1. 改版本号（`package.json` + `src-tauri/tauri.conf.json` + `Cargo.toml`）
2. `git tag v0.1.0 && git push origin v0.1.0`
3. Actions `release` workflow 会构建 macOS（arm64/x64）、Linux、Windows，并上传到 GitHub Release

详细说明见 [docs/release.md](docs/release.md)。

## 用户安装

1. 从 [Releases](https://github.com/zhaoc/harness/releases) 下载对应平台安装包
2. 安装后确保本机有 Node.js
3. 打开应用 → 设置里填写 API Key → 欢迎页打开工作区

macOS 未公证时：首次右键图标 → 打开。

Agent 会安装到应用数据目录的本地 npm 前缀，避免每次冷启动 `npx`。可在设置中检查/更新。

## License

MIT。上游归属 BitFun / bobleer；Agent 本体为 DeepSeek Harness。
