export type PluginCategory = "all" | "official" | "ui" | "agent" | "dev" | "mcp";
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
}

export const AWESOME_RADAR_REPO = "https://github.com/AdamPlatin123/awesome-dsh-plugins";

export const CURATED_PLUGINS: CuratedPlugin[] = [
  // Official Plugins
  {
    name: "MCP Client",
    packageName: "@deepseek-ai/dsh-mcp-client",
    description: {
      zh: "官方 Model Context Protocol (MCP) 客户端，连接外部工具、数据源和本地服务。",
      en: "Official Model Context Protocol (MCP) client connecting external tools and data.",
    },
    author: "DeepSeek",
    isOfficial: true,
    compatibility: "official",
    category: "official",
    tags: ["Official", "MCP", "Tools"],
  },
  {
    name: "Web Search",
    packageName: "@deepseek-ai/dsh-plugin-search",
    description: {
      zh: "官方网络搜索增强插件，赋予 Agent 实时联网检索信息和抓取网页能力。",
      en: "Official search plugin enabling real-time web search and page retrieval.",
    },
    author: "DeepSeek",
    isOfficial: true,
    compatibility: "official",
    category: "official",
    tags: ["Official", "Search", "Network"],
  },
  {
    name: "Python Code Runner",
    packageName: "@deepseek-ai/dsh-plugin-python",
    description: {
      zh: "官方 Python 解释器插件，支持在安全沙箱中执行 Python 数据分析与脚本。",
      en: "Official Python code interpreter for data analysis and script execution.",
    },
    author: "DeepSeek",
    isOfficial: true,
    compatibility: "official",
    category: "official",
    tags: ["Official", "Python", "Runtime"],
  },
  {
    name: "Git SCM Tools",
    packageName: "@deepseek-ai/dsh-plugin-git",
    description: {
      zh: "深度 Git 仓库集成，支持生成精准 Commit、分析分支差异与 Pull Request。",
      en: "Deep Git SCM integration for commit generation, diff analysis, and PRs.",
    },
    author: "DeepSeek",
    isOfficial: true,
    compatibility: "official",
    category: "official",
    tags: ["Official", "Git", "VCS"],
  },
  {
    name: "Docker Container Tools",
    packageName: "@deepseek-ai/dsh-plugin-docker",
    description: {
      zh: "Docker 容器管理与构建插件，支持运行隔离测试环境与容器命令。",
      en: "Docker container management tools for test environments and containers.",
    },
    author: "DeepSeek",
    isOfficial: true,
    compatibility: "official",
    category: "official",
    tags: ["Official", "Docker", "DevOps"],
  },

  // Web UI Enhancements (from Awesome Radar)
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
  },
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
    category: "ui",
    tags: ["Vision", "VLM", "Multimodal"],
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
  },

  // Agent Capabilities (from Awesome Radar)
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
    category: "agent",
    tags: ["Agent", "Todos", "Progress"],
  },
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
    category: "agent",
    tags: ["Agent", "Memory", "Search"],
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
  },

  // Coding & Developer Tools (from Awesome Radar)
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
    category: "dev",
    tags: ["Evolution", "Memory", "Git"],
  },
];
