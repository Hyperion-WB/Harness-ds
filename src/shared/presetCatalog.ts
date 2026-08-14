export interface AgentPreset {
  id: string;
  name: string;
  codeName: string;
  isBuiltin: boolean;
  description: {
    zh: string;
    en: string;
  };
  features: string[];
  configSnippet: string;
}

export const BUILTIN_PRESETS: AgentPreset[] = [
  {
    id: "standard",
    name: "标准模式",
    codeName: "standard",
    isBuiltin: true,
    description: {
      zh: "功能完整的编码 Agent，支持文件编辑、Shell、文件与网页检索、Skills、计划、目标、子代理和工作流。",
      en: "Full-featured coding Agent with file editing, shell, search, skills, planning, subagents, and workflows.",
    },
    features: ["File Editing", "Shell", "Skills", "Planning", "Subagents", "Workflows"],
    configSnippet: `# Standard full-featured coding agent
preset: standard
plugins:
  - "@deepseek-ai/dsh-mcp-client"
  - "@deepseek-ai/dsh-plugin-search"
  - "@deepseek-ai/dsh-plugin-git"`,
  },
  {
    id: "code",
    name: "PTC 模式",
    codeName: "code",
    isBuiltin: true,
    description: {
      zh: "具备标准模式的全部能力，并通过 Code Mode SDK 呈现工具，让模型用一个 TypeScript 程序组合多步操作。",
      en: "Standard capabilities with Code Mode SDK, allowing multi-step composition via TypeScript programs.",
    },
    features: ["Code Mode SDK", "Programmatic Tool Composition", "TypeScript Runner"],
    configSnippet: `# PTC Mode: Code Mode SDK programmatic tools
preset: code
tools:
  mode: sdk-programmatic`,
  },
  {
    id: "minimal",
    name: "极简模式",
    codeName: "minimal",
    isBuiltin: true,
    description: {
      zh: "仅提供持久 bash 与 str_replace_editor 的双工具编码 Agent，追求极简与低上下文消耗。",
      en: "Minimalist dual-tool coding Agent with persistent bash and str_replace_editor for low token overhead.",
    },
    features: ["Persistent Bash", "str_replace_editor", "Low Token Overhead"],
    configSnippet: `# Minimalist dual-tool agent
preset: minimal
tools:
  - bash
  - str_replace_editor`,
  },
  {
    id: "cordis",
    name: "创造模式",
    codeName: "cordis",
    isBuiltin: true,
    description: {
      zh: "用于创建自定义 Agent preset: 具备标准模式全部能力，并提供运行时检查、插件实验和 preset 创作指导。",
      en: "Preset creation sandbox with runtime introspection, plugin experimentation, and authoring guide.",
    },
    features: ["Preset Authoring", "Plugin Sandbox", "Runtime Inspection"],
    configSnippet: `# Cordis mode: authoring & experimenting with custom presets
preset: cordis
capabilities:
  - inspect
  - experiment
  - author-guide`,
  },
];
