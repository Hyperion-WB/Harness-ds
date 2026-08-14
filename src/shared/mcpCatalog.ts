export interface McpTemplate {
  id: string;
  serverName: string;
  displayName: {
    zh: string;
    en: string;
  };
  description: {
    zh: string;
    en: string;
  };
  transport: "stdio" | "streamable-http";
  command: string;
  argsText: string;
  cwd: string;
  url?: string;
  env?: Record<string, string>;
  headers?: Record<string, string>;
  category: "fs" | "vcs" | "network" | "memory" | "database" | "browser";
}

export const MCP_TEMPLATES: McpTemplate[] = [
  {
    id: "mcp-filesystem",
    serverName: "filesystem",
    displayName: {
      zh: "本地文件系统 (Filesystem)",
      en: "Local Filesystem",
    },
    description: {
      zh: "允许 Agent 安全读取和编辑指定的本地目录与文件。",
      en: "Allows the agent to read and edit local files and directories.",
    },
    transport: "stdio",
    command: "npx",
    argsText: "-y @modelcontextprotocol/server-filesystem .",
    cwd: ".",
    category: "fs",
  },
  {
    id: "mcp-git",
    serverName: "git",
    displayName: {
      zh: "Git 仓库集成 (Git)",
      en: "Git Version Control",
    },
    description: {
      zh: "允许 Agent 执行 Git status、diff、log、commit 等版本控制命令。",
      en: "Enables Git commands like status, diff, log, and commit.",
    },
    transport: "stdio",
    command: "npx",
    argsText: "-y @modelcontextprotocol/server-git .",
    cwd: ".",
    category: "vcs",
  },
  {
    id: "mcp-fetch",
    serverName: "fetch",
    displayName: {
      zh: "网页抓取与解析 (Fetch)",
      en: "Web Fetch & Parse",
    },
    description: {
      zh: "抓取 Web 网页内容并自动转为清晰的 Markdown 文档供 Agent 阅读。",
      en: "Fetches and transforms web pages into clean Markdown for the agent.",
    },
    transport: "stdio",
    command: "npx",
    argsText: "-y @modelcontextprotocol/server-fetch",
    cwd: ".",
    category: "network",
  },
  {
    id: "mcp-memory",
    serverName: "memory",
    displayName: {
      zh: "持久化知识图谱与记忆 (Memory)",
      en: "Knowledge Graph & Memory",
    },
    description: {
      zh: "为 Agent 提供跨会话的实体关系知识图谱与长期记忆存储。",
      en: "Provides cross-session knowledge graph and long-term memory.",
    },
    transport: "stdio",
    command: "npx",
    argsText: "-y @modelcontextprotocol/server-memory",
    cwd: ".",
    category: "memory",
  },
  {
    id: "mcp-sqlite",
    serverName: "sqlite",
    displayName: {
      zh: "SQLite 数据库查询 (SQLite)",
      en: "SQLite Database",
    },
    description: {
      zh: "连接本地 SQLite 数据库，执行 SQL 查询并分析表结构与数据。",
      en: "Connects to a local SQLite database for queries and analysis.",
    },
    transport: "stdio",
    command: "npx",
    argsText: "-y @modelcontextprotocol/server-sqlite --db-path ./database.sqlite",
    cwd: ".",
    category: "database",
  },
  {
    id: "mcp-puppeteer",
    serverName: "puppeteer",
    displayName: {
      zh: "无头浏览器自动化 (Puppeteer)",
      en: "Puppeteer Browser Automation",
    },
    description: {
      zh: "使用 Chromium 运行自动化浏览器测试、截图与动态网页抓取。",
      en: "Uses headless Chromium for browser automation and screenshots.",
    },
    transport: "stdio",
    command: "npx",
    argsText: "-y @modelcontextprotocol/server-puppeteer",
    cwd: ".",
    category: "browser",
  },
];
