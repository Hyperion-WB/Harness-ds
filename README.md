# DeepSeek Harness GUI 桌面客户端

中文 | [English](README.en.md)

**DeepSeek Harness GUI** 是专为官方 [DeepSeek Harness (`dsh web`)](https://github.com/deepseek-ai/deepseek-harness) 打造的原生跨平台桌面客户端（基于 Tauri 2 + React 19 构建）。不仅完美内嵌官方强大的 Agent 编码与会话引擎，更融入了媲美原生系统的视效交互、全局多模型网关、智能插件市场与 MCP 协议扩展。

---

## ✨ 核心特性

### 1. 🖥️ 原生桌面体验与流畅视效
- **Apple 设计语言**：丝滑的物理弹性滑块（Sliding Pill）、沉浸式毛玻璃拟态、暗色/亮色/跟随系统主题无缝切换。
- **系统托盘与常驻**：支持最小化至系统托盘、关闭至后台常驻、单实例防重启动、窗口尺寸与位置记忆。
- **全局呼出快捷键**：默认 `Ctrl+Shift+H`（Mac 为 `⌘+Shift+H`）随时一键唤出/隐藏。
- **⌘K 命令面板**：快速检索工作区、执行快捷动作与无缝跨页面跳转。

### 2. 🤖 多厂商模型服务与统一凭证管理
- **主流模型开箱即用**：
  - **DeepSeek 官方**：DeepSeek-V4-Flash、DeepSeek-V4-Pro、deepseek-chat (V3)、deepseek-reasoner (R1)
  - **硅基流动 (SiliconFlow)**：云端高并发 DeepSeek-V3 / R1 与 Qwen2.5-Coder
  - **Ollama 本地运行**：免 API Key，一键接入本地 deepseek-r1 / qwen2.5 等离线模型
  - **云端聚合与大厂模型**：OpenRouter、阿里通义千问 (DashScope)、Moonshot (Kimi)、智谱 (GLM-4)、Anthropic (Claude)、OpenAI 等
  - **自定义网关**：支持任意 OpenAI / Anthropic 兼容协议的私有大模型与中转服务
- **安全持久化**：优先使用系统原生钥匙串（OS Keyring）加密存储凭证，配置直接写入官方 `~/.dsh`，升级不丢失。

### 3. 🧩 精选插件市场、雷达源同步与智能分类
- **286+ 社区雷达同步**：一键从 GitHub / CDN 远程雷达源同步最新插件索引与兼容性评级。
- **智能多维自动归类**：
  - 🌟 **官方精选 (`official`)**：官方核心拓展与能力
  - 🎨 **Web 界面增强 (`ui`)**：主题换肤、多模态视觉桥接、剪贴板粘贴、输入历史、TPS 速率监控等
  - 🤖 **智能体能力 (`agent`)**：跨会话长期记忆、提示词工作台、任务决策墙、双模型路由、思维进化等
  - 🛠️ **开发与系统 (`dev`)**：Git SCM 集成、终端编码自适应、Windows PTY 适配、Docker、Python 沙箱等
  - 🔌 **MCP 协议 (`mcp`)**：外部工具与数据源连接
- **插件版本检测与一键全量升级**：实时比对 npm 最新发布版本，提供单插件升级与一键全部升级。

### 4. ⚡ 1-Click MCP 服务器模板
- 内置开箱即用的常用 MCP 服务模板：
  - **本地文件系统 (Filesystem)**
  - **Git 仓库版本控制 (Git)**
  - **网页抓取解析 (Fetch)**
  - **持久化知识图谱与记忆 (Memory)**
  - **SQLite 本地数据库查询 (SQLite)**
  - **无头浏览器自动化 (Puppeteer)**
- 自动化写入 `~/.dsh/cordis.patch.yml`，提供标准工具调用能力。

### 5. 🎯 预设模式切换 (Agent Presets)
- **标准模式 (Standard)**：全功能编码 Agent，支持文件编辑、Shell、检索、Skills、计划制定与子代理。
- **PTC 模式 (Code Mode)**：基于 Code Mode SDK，模型通过编写 TypeScript 脚本程序化组合多步工具操作。
- **极简模式 (Minimal)**：极低上下文消耗的双工具（持久 Bash + 编辑器）模式。
- **创造模式 (Cordis)**：自定义预设与插件实验沙箱。

### 6. 🛠️ 开发者工作流整合
- **IDE 快速联动**：一键在 VS Code、Cursor、系统终端、文件管理器中定位当前工作区。
- **运行控制台 (Live Logs)**：实时捕获并高亮子进程 stdout/stderr，支持内容过滤与一键复制。
- **Agent 核心热升级**：内置后台自动检查 `@deepseek-ai/dsh` 核心版本，应用内一键无缝热重载。

---

## 📦 环境依赖

运行 DeepSeek Harness 需要本机安装：
- **Node.js**：`^22.19 || >=24`
- **pnpm**：`10+`（源码开发时需要）
- **DeepSeek API Key** 或其他兼容模型 API Key（使用 Ollama 本地模型时可免 Key）

---

## 🚀 快速开始

### 方式一：下载预编译安装包（推荐）
前往 [Releases 页面](https://github.com/Hyperion-WB/Harness-ds/releases) 下载适合您操作系统的安装包：
- **Windows**: `.exe` (安装引导程序) 或 `.msi`
- **macOS**: `.dmg` (Apple Silicon M系列与 Intel 双架构支持)
- **Linux**: `.AppImage` 或 `.deb`

安装完成后打开应用，在「设置 → 模型服务」中配置 API Key，随后在「欢迎」页选择任意本地项目目录即可开启官方 Harness 会话！

> **macOS 首次打开提示未公证**：在 Finder 中右键点击应用图标 → 选择「打开」即可。

---

### 方式二：从源码本地运行

```bash
# 1. 克隆仓库
git clone https://github.com/Hyperion-WB/Harness-ds.git
cd Harness-ds

# 2. 安装依赖
pnpm install

# 3. 启动开发模式（Tauri 桌面端）
pnpm desktop:dev
```

常用命令：
```bash
pnpm typecheck   # 运行 TypeScript 类型检查
pnpm test        # 运行 Vitest 单元测试
pnpm build       # 编译前端生产包
```

---

## 🚢 自动化打包与发布流程 (CI/CD)

本项目配置了基于 GitHub Actions 的多平台全自动编译与发布流水线：

1. 更新版本号（如 `0.1.0`）
2. 提交代码并推送 Git Tag：
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```
3. GitHub Actions 自动并发在 **Windows、macOS (arm64 + x64)、Ubuntu** 三大系统上执行打包，并自动将产物上传发布至 GitHub Release。

---

## 📄 开源许可证

本项目基于 [MIT License](LICENSE) 协议开源。
上游架构灵感归属 BitFun / bobleer；Agent 核心运行时归属于 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)。
