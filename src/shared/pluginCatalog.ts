export type PluginCategory =
  | "all"
  | "featured"
  | "official"
  | "ui"
  | "agent"
  | "memory"
  | "dev"
  | "vision"
  | "mcp";

export type CompatibilityStatus = "official" | "compatible" | "watch";

export interface CuratedPlugin {
  name: string;
  packageName: string;
  repoUrl?: string;
  description: {
    zh: string;
    en: string;
  };
  author: string;
  isOfficial: boolean;
  compatibility: CompatibilityStatus;
  category: PluginCategory;
  tags: string[];
  stars?: number;
  featured?: boolean;
}

export const AWESOME_RADAR_REPO = "https://github.com/AdamPlatin123/awesome-dsh-plugins";

export const CURATED_PLUGINS: CuratedPlugin[] = [
  // ==========================================
  // 1. Official Core Plugins (DeepSeek 官方认证)
  // ==========================================
  {
    name: "MCP Client",
    packageName: "@deepseek-ai/dsh-mcp-client",
    description: {
      zh: "官方 Model Context Protocol (MCP) 客户端，一键连接外部工具、数据源与本地生态。",
      en: "Official Model Context Protocol (MCP) client connecting external tools and data sources.",
    },
    author: "DeepSeek",
    isOfficial: true,
    compatibility: "official",
    category: "official",
    tags: ["Official", "MCP", "Protocol"],
    stars: 1280,
    featured: true,
  },
  {
    name: "Web Search",
    packageName: "@deepseek-ai/dsh-plugin-search",
    description: {
      zh: "官方网络搜索增强插件，赋予 Agent 实时联网检索信息、抓取网页与深度分析能力。",
      en: "Official search plugin enabling real-time web search, browsing, and summarization.",
    },
    author: "DeepSeek",
    isOfficial: true,
    compatibility: "official",
    category: "official",
    tags: ["Official", "Search", "Network"],
    stars: 940,
    featured: true,
  },
  {
    name: "Python Code Runner",
    packageName: "@deepseek-ai/dsh-plugin-python",
    description: {
      zh: "官方 Python 解释器插件，支持在安全沙箱中执行 Python 数据分析、图表绘制与脚本。",
      en: "Official Python code interpreter for sandboxed data analysis, charting, and scripts.",
    },
    author: "DeepSeek",
    isOfficial: true,
    compatibility: "official",
    category: "official",
    tags: ["Official", "Python", "Runtime"],
    stars: 860,
    featured: true,
  },
  {
    name: "Git SCM Tools",
    packageName: "@deepseek-ai/dsh-plugin-git",
    description: {
      zh: "深度 Git 仓库集成，支持生成精准 Commit、分析分支差异、创建 PR 与版本追踪。",
      en: "Deep Git SCM integration for commit generation, diff analysis, PRs, and history.",
    },
    author: "DeepSeek",
    isOfficial: true,
    compatibility: "official",
    category: "official",
    tags: ["Official", "Git", "VCS"],
    stars: 790,
  },
  {
    name: "Docker Container Tools",
    packageName: "@deepseek-ai/dsh-plugin-docker",
    description: {
      zh: "Docker 容器管理与构建插件，支持运行隔离测试环境与容器命令生命周期。",
      en: "Docker container management tools for test environments and container commands.",
    },
    author: "DeepSeek",
    isOfficial: true,
    compatibility: "official",
    category: "official",
    tags: ["Official", "Docker", "DevOps"],
    stars: 650,
  },

  // ==========================================
  // 2. UI & Interaction Enhancements (UI交互增强)
  // ==========================================
  {
    name: "DSH Plugin Hub (插件中心)",
    packageName: "github:Sanqi-normal/dsh-webui-market-plugin",
    repoUrl: "https://github.com/Sanqi-normal/dsh-webui-market-plugin",
    description: {
      zh: "DSH 插件市场中心：右下角悬浮面板，聚合 GitHub 雷达扫描、社区插件热榜与一键安装。",
      en: "DSH Plugin Hub: floating market drawer, GitHub radar scanning, and one-click install.",
    },
    author: "Sanqi-normal",
    isOfficial: false,
    compatibility: "compatible",
    category: "ui",
    tags: ["UI", "Market", "PluginHub"],
    stars: 520,
    featured: true,
  },
  {
    name: "Input History",
    packageName: "github:dsh-external/dsh-input-history",
    repoUrl: "https://github.com/dsh-external/dsh-input-history",
    description: {
      zh: "Web 输入历史插件：Ctrl+Up / Ctrl+Down 像终端一样召回与切换历史消息。",
      en: "Recall and cycle message history in composer using Ctrl+Up / Ctrl+Down.",
    },
    author: "dsh-external",
    isOfficial: false,
    compatibility: "compatible",
    category: "ui",
    tags: ["UI", "History", "Composer"],
    stars: 480,
    featured: true,
  },
  {
    name: "Paste Input",
    packageName: "github:dsh-external/dsh-paste-input",
    repoUrl: "https://github.com/dsh-external/dsh-paste-input",
    description: {
      zh: "文件输入增强：Ctrl+V 直接粘贴图片与文件，发送时自动复制进工作区。",
      en: "Ctrl+V paste files and images directly into workspace conversation.",
    },
    author: "dsh-external",
    isOfficial: false,
    compatibility: "compatible",
    category: "ui",
    tags: ["UI", "Paste", "Files"],
    stars: 390,
  },
  {
    name: "DSH Skins (多主题换肤)",
    packageName: "github:dsh-external/dsh-skins",
    repoUrl: "https://github.com/dsh-external/dsh-skins",
    description: {
      zh: "官方 ThemeService 第三方皮肤库与 AI 生图动态背景，零核心入侵。",
      en: "Third-party themes and AI background skins for ThemeService.",
    },
    author: "dsh-external",
    isOfficial: false,
    compatibility: "watch",
    category: "ui",
    tags: ["UI", "Themes", "Skins"],
    stars: 310,
  },
  {
    name: "Live Stats (实时 TPS/Token 仪表盘)",
    packageName: "github:dsh-external/dsh-live-stats",
    repoUrl: "https://github.com/dsh-external/dsh-live-stats",
    description: {
      zh: "实时统计输入/输出 Token 估算以及生成速率 TPS 仪表盘。",
      en: "Live input/output token estimates and generation TPS meter.",
    },
    author: "dsh-external",
    isOfficial: false,
    compatibility: "watch",
    category: "ui",
    tags: ["Stats", "TPS", "Tokens"],
    stars: 270,
  },
  {
    name: "UI Progress (任务进度条)",
    packageName: "github:dsh-external/dsh-ui-progress",
    repoUrl: "https://github.com/dsh-external/dsh-ui-progress",
    description: {
      zh: "输入框停靠区常驻会话进度条：todos 真实完成进度与实时 token 速率。",
      en: "Persistent conversation progress bar with real todos completion tracking.",
    },
    author: "dsh-external",
    isOfficial: false,
    compatibility: "compatible",
    category: "ui",
    tags: ["UI", "Progress", "Todos"],
    stars: 230,
  },

  // ==========================================
  // 3. Agent & Prompts (Agent提示词与决策)
  // ==========================================
  {
    name: "Prompt Studio",
    packageName: "github:dsh-external/dsh-prompt-studio",
    repoUrl: "https://github.com/dsh-external/dsh-prompt-studio",
    description: {
      zh: "系统提示词工作台：可视化编辑系统提示词分段并实时预览生效。",
      en: "Edit user and built-in system-prompt sections with live preview.",
    },
    author: "dsh-external",
    isOfficial: false,
    compatibility: "compatible",
    category: "agent",
    tags: ["Agent", "Prompt", "Studio"],
    stars: 460,
    featured: true,
  },
  {
    name: "Track Bridge (任务与决策墙)",
    packageName: "github:dsh-external/dsh-track",
    repoUrl: "https://github.com/dsh-external/dsh-track",
    description: {
      zh: "嵌入式任务管理引擎：决策点协议、念头捕获墙、Linear 风格 issue 存储。",
      en: "Embedded task engine: decision protocol, thought capture, Linear issues.",
    },
    author: "dsh-external",
    isOfficial: false,
    compatibility: "compatible",
    category: "agent",
    tags: ["Agent", "Tasks", "Decisions"],
    stars: 410,
    featured: true,
  },
  {
    name: "Plan-Execute (双模型路由)",
    packageName: "github:dsh-external/dsh-plan-execute",
    repoUrl: "https://github.com/dsh-external/dsh-plan-execute",
    description: {
      zh: "规划/执行双模型自动路由：plan 模式用推理模型，批准后自动切执行模型。",
      en: "Dual-model routing: reasoning model for planning, fast model for execution.",
    },
    author: "dsh-external",
    isOfficial: false,
    compatibility: "watch",
    category: "agent",
    tags: ["Agent", "DualModel", "Routing"],
    stars: 350,
  },

  // ==========================================
  // 4. Memory & Knowledge (记忆与知识库)
  // ==========================================
  {
    name: "Recall (跨会话记忆检索)",
    packageName: "github:dsh-external/Recall",
    repoUrl: "https://github.com/dsh-external/Recall",
    description: {
      zh: "本地优先跨会话记忆：在不同编码会话与 Agent 间保持上下文知识库。",
      en: "Local-first search across your AI coding sessions with memory persistence.",
    },
    author: "dsh-external",
    isOfficial: false,
    compatibility: "compatible",
    category: "memory",
    tags: ["Memory", "Recall", "Knowledge"],
    stars: 540,
    featured: true,
  },
  {
    name: "Memory Evolve (自进化记忆)",
    packageName: "github:dsh-external/dsh-memory-evolve",
    repoUrl: "https://github.com/dsh-external/dsh-memory-evolve",
    description: {
      zh: "跨会话长期记忆与自我进化：五轨记忆 · Git 分支感知 · 回合内自我审查。",
      en: "Cross-session memory with self-evolution and git branch awareness.",
    },
    author: "dsh-external",
    isOfficial: false,
    compatibility: "compatible",
    category: "memory",
    tags: ["Memory", "Evolution", "Git"],
    stars: 380,
  },

  // ==========================================
  // 5. Developer & Terminal Tools (开发者与终端)
  // ==========================================
  {
    name: "Bash Encoding (编码自适应)",
    packageName: "github:dsh-external/dsh-bash-encoding",
    repoUrl: "https://github.com/dsh-external/dsh-bash-encoding",
    description: {
      zh: "终端输出编码自动识别：智能检测 UTF-8 / GBK / UTF-16LE 编码并消除乱码。",
      en: "Automatic terminal encoding detector (UTF-8, GBK, UTF-16) for clean outputs.",
    },
    author: "dsh-external",
    isOfficial: false,
    compatibility: "compatible",
    category: "dev",
    tags: ["Terminal", "Encoding", "Windows"],
    stars: 430,
    featured: true,
  },
  {
    name: "PTY Windows Adapter",
    packageName: "github:dsh-external/dsh-pty-windows",
    repoUrl: "https://github.com/dsh-external/dsh-pty-windows",
    description: {
      zh: "Windows PTY 进程检查器与 PowerShell 适配器，优化本地命令执行稳定性。",
      en: "Windows PTY process inspector and PowerShell adapter for stability.",
    },
    author: "dsh-external",
    isOfficial: false,
    compatibility: "compatible",
    category: "dev",
    tags: ["Windows", "PTY", "PowerShell"],
    stars: 340,
  },
  {
    name: "DSH-TUI (快速终端模式)",
    packageName: "github:dsh-external/dsh-tui",
    repoUrl: "https://github.com/dsh-external/dsh-tui",
    description: {
      zh: "轻量高速终端 TUI 模式：在纯命令行界面直接连接并交互 DSH Agent 运行时。",
      en: "Lightweight and fast terminal UI connecting directly to the DSH runtime.",
    },
    author: "dsh-external",
    isOfficial: false,
    compatibility: "compatible",
    category: "dev",
    tags: ["TUI", "CLI", "Terminal"],
    stars: 290,
  },
  {
    name: "DSH VSCode Bridge",
    packageName: "github:dsh-external/dsh-vscode",
    repoUrl: "https://github.com/dsh-external/dsh-vscode",
    description: {
      zh: "VS Code 侧边栏深度桥接：在编辑器内直接呼出 DeepSeek Harness 会话与协同。",
      en: "Run DeepSeek Harness in the VS Code sidebar with editor context bridging.",
    },
    author: "dsh-external",
    isOfficial: false,
    compatibility: "compatible",
    category: "dev",
    tags: ["VSCode", "IDE", "Bridge"],
    stars: 490,
    featured: true,
  },

  // ==========================================
  // 6. Vision & Multimodal (视觉与多模态)
  // ==========================================
  {
    name: "DSH Vision (多模态视觉)",
    packageName: "github:dsh-external/dsh-vision",
    repoUrl: "https://github.com/dsh-external/dsh-vision",
    description: {
      zh: "给纯文本 DeepSeek 赋予视觉：view_image 桥接任意 OpenAI 兼容 VLM 模型。",
      en: "Bridge OpenAI-compatible VLM to grant vision capability to DeepSeek.",
    },
    author: "dsh-external",
    isOfficial: false,
    compatibility: "watch",
    category: "vision",
    tags: ["Vision", "VLM", "Multimodal"],
    stars: 370,
    featured: true,
  },

  // ==========================================
  // 7. MCP Ecosystem (MCP 生态)
  // ==========================================
  {
    name: "Filesystem MCP",
    packageName: "@modelcontextprotocol/server-filesystem",
    description: {
      zh: "标准 MCP 本地文件系统服务：为 Agent 赋予安全沙箱外的指定目录直读直写能力。",
      en: "Standard MCP filesystem server giving read/write capability to local directories.",
    },
    author: "MCP",
    isOfficial: false,
    compatibility: "compatible",
    category: "mcp",
    tags: ["MCP", "Filesystem", "IO"],
    stars: 620,
  },
  {
    name: "PostgreSQL MCP",
    packageName: "@modelcontextprotocol/server-postgres",
    description: {
      zh: "PostgreSQL 数据库 MCP 连接器：直接查询表结构、生成分析 SQL 并执行只读测试。",
      en: "PostgreSQL database MCP server for schema inspection and read-only queries.",
    },
    author: "MCP",
    isOfficial: false,
    compatibility: "compatible",
    category: "mcp",
    tags: ["MCP", "Database", "SQL"],
    stars: 440,
  },
];
