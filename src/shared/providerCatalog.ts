/** Presets mirroring common Claude/Cursor-style provider setup. */

export type ProviderVendor =
  | "deepseek-official"
  | "siliconflow"
  | "ollama"
  | "openrouter"
  | "qwen"
  | "moonshot"
  | "zhipu"
  | "anthropic"
  | "openai"
  | "deepseek"
  | "custom";

export interface ProviderVendorPreset {
  vendor: ProviderVendor;
  kind: "deepseek-official" | "catalog" | "custom";
  id: string;
  displayName: string;
  baseURL: string;
  api: string | null;
  apiKeyEnv: string;
  apiKeyOptional?: boolean;
  models: Array<{ id: string; label: string }>;
  idEditable: boolean;
}

export const PROVIDER_VENDORS: ProviderVendorPreset[] = [
  {
    vendor: "deepseek-official",
    kind: "deepseek-official",
    id: "deepseek-official",
    displayName: "DeepSeek",
    baseURL: "https://api.deepseek.com",
    api: null,
    apiKeyEnv: "DEEPSEEK_API_KEY",
    models: [
      { id: "deepseek-v4-flash", label: "DeepSeek-V4-Flash" },
      { id: "deepseek-v4-pro", label: "DeepSeek-V4-Pro" },
      { id: "deepseek-chat", label: "deepseek-chat (V3)" },
      { id: "deepseek-reasoner", label: "deepseek-reasoner (R1)" },
    ],
    idEditable: false,
  },
  {
    vendor: "siliconflow",
    kind: "custom",
    id: "siliconflow",
    displayName: "SiliconFlow (硅基流动)",
    baseURL: "https://api.siliconflow.cn/v1",
    api: "openai-completions",
    apiKeyEnv: "SILICONFLOW_API_KEY",
    models: [
      { id: "deepseek-ai/DeepSeek-V3", label: "DeepSeek-V3" },
      { id: "deepseek-ai/DeepSeek-R1", label: "DeepSeek-R1" },
      { id: "Pro/deepseek-ai/DeepSeek-V3", label: "Pro DeepSeek-V3" },
      { id: "Pro/deepseek-ai/DeepSeek-R1", label: "Pro DeepSeek-R1" },
      { id: "Qwen/Qwen2.5-Coder-32B-Instruct", label: "Qwen2.5-Coder-32B" },
    ],
    idEditable: true,
  },
  {
    vendor: "ollama",
    kind: "custom",
    id: "ollama",
    displayName: "Ollama (本地运行)",
    baseURL: "http://localhost:11434/v1",
    api: "openai-completions",
    apiKeyEnv: "OLLAMA_API_KEY",
    apiKeyOptional: true,
    models: [
      { id: "deepseek-r1:7b", label: "deepseek-r1:7b" },
      { id: "deepseek-r1:8b", label: "deepseek-r1:8b" },
      { id: "deepseek-r1:14b", label: "deepseek-r1:14b" },
      { id: "deepseek-r1:32b", label: "deepseek-r1:32b" },
      { id: "qwen2.5-coder:7b", label: "qwen2.5-coder:7b" },
      { id: "qwen2.5-coder:14b", label: "qwen2.5-coder:14b" },
      { id: "qwen2.5-coder:32b", label: "qwen2.5-coder:32b" },
      { id: "llama3.3:70b", label: "llama3.3:70b" },
    ],
    idEditable: true,
  },
  {
    vendor: "openrouter",
    kind: "custom",
    id: "openrouter",
    displayName: "OpenRouter",
    baseURL: "https://openrouter.ai/api/v1",
    api: "openai-completions",
    apiKeyEnv: "OPENROUTER_API_KEY",
    models: [
      { id: "deepseek/deepseek-r1", label: "deepseek/deepseek-r1" },
      { id: "deepseek/deepseek-chat", label: "deepseek/deepseek-chat" },
      { id: "anthropic/claude-3.5-sonnet", label: "claude-3.5-sonnet" },
      { id: "openai/gpt-4o", label: "openai/gpt-4o" },
      { id: "openai/o3-mini", label: "openai/o3-mini" },
    ],
    idEditable: true,
  },
  {
    vendor: "qwen",
    kind: "custom",
    id: "qwen",
    displayName: "阿里通义千问 (DashScope)",
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    api: "openai-completions",
    apiKeyEnv: "DASHSCOPE_API_KEY",
    models: [
      { id: "qwen-max", label: "qwen-max" },
      { id: "qwen-plus", label: "qwen-plus" },
      { id: "qwen-turbo", label: "qwen-turbo" },
      { id: "qwen2.5-coder-32b-instruct", label: "qwen2.5-coder-32b" },
      { id: "deepseek-v3", label: "deepseek-v3 (百炼)" },
      { id: "deepseek-r1", label: "deepseek-r1 (百炼)" },
    ],
    idEditable: true,
  },
  {
    vendor: "moonshot",
    kind: "custom",
    id: "moonshot",
    displayName: "Moonshot (Kimi)",
    baseURL: "https://api.moonshot.cn/v1",
    api: "openai-completions",
    apiKeyEnv: "MOONSHOT_API_KEY",
    models: [
      { id: "moonshot-v1-8k", label: "moonshot-v1-8k" },
      { id: "moonshot-v1-32k", label: "moonshot-v1-32k" },
      { id: "moonshot-v1-128k", label: "moonshot-v1-128k" },
    ],
    idEditable: true,
  },
  {
    vendor: "zhipu",
    kind: "custom",
    id: "zhipu",
    displayName: "智谱清言 (GLM-4)",
    baseURL: "https://open.bigmodel.cn/api/paas/v4",
    api: "openai-completions",
    apiKeyEnv: "ZHIPUAI_API_KEY",
    models: [
      { id: "glm-4-plus", label: "glm-4-plus" },
      { id: "glm-4-flash", label: "glm-4-flash" },
      { id: "glm-4-air", label: "glm-4-air" },
      { id: "glm-4-long", label: "glm-4-long" },
    ],
    idEditable: true,
  },
  {
    vendor: "anthropic",
    kind: "catalog",
    id: "anthropic",
    displayName: "Anthropic",
    baseURL: "https://api.anthropic.com",
    api: null,
    apiKeyEnv: "ANTHROPIC_API_KEY",
    models: [
      { id: "claude-opus-4-5", label: "Claude Opus 4.5" },
      { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
      { id: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
      { id: "claude-3-5-sonnet-latest", label: "Claude 3.5 Sonnet" },
    ],
    idEditable: false,
  },
  {
    vendor: "openai",
    kind: "catalog",
    id: "openai",
    displayName: "OpenAI",
    baseURL: "https://api.openai.com/v1",
    api: null,
    apiKeyEnv: "OPENAI_API_KEY",
    models: [
      { id: "gpt-4o", label: "GPT-4o" },
      { id: "gpt-4o-mini", label: "GPT-4o mini" },
      { id: "o1", label: "o1" },
      { id: "o3-mini", label: "o3-mini" },
    ],
    idEditable: false,
  },
  {
    vendor: "deepseek",
    kind: "catalog",
    id: "deepseek",
    displayName: "DeepSeek (OpenAI-compatible)",
    baseURL: "https://api.deepseek.com/v1",
    api: null,
    apiKeyEnv: "DEEPSEEK_API_KEY",
    models: [
      { id: "deepseek-chat", label: "deepseek-chat" },
      { id: "deepseek-reasoner", label: "deepseek-reasoner" },
    ],
    idEditable: false,
  },
  {
    vendor: "custom",
    kind: "custom",
    id: "",
    displayName: "",
    baseURL: "",
    api: "openai-completions",
    apiKeyEnv: "",
    models: [],
    idEditable: true,
  },
];

export const API_PROTOCOLS = [
  { value: "openai-completions", label: "OpenAI Completions" },
  { value: "anthropic-messages", label: "Anthropic Messages" },
] as const;

export function presetForVendor(vendor: ProviderVendor): ProviderVendorPreset {
  return PROVIDER_VENDORS.find((item) => item.vendor === vendor) ?? PROVIDER_VENDORS[0];
}

export function vendorOptions(locale: "zh" | "en") {
  return PROVIDER_VENDORS.map((preset) => ({
    value: preset.vendor,
    label:
      locale === "zh"
        ? {
            "deepseek-official": "DeepSeek 官方",
            siliconflow: "SiliconFlow 硅基流动",
            ollama: "Ollama 本地运行 (免 Key)",
            openrouter: "OpenRouter 聚合",
            qwen: "阿里通义千问 (DashScope)",
            moonshot: "Moonshot (Kimi)",
            zhipu: "智谱清言 (GLM-4)",
            anthropic: "Anthropic (Claude)",
            openai: "OpenAI",
            deepseek: "DeepSeek (兼容接口)",
            custom: "自定义 / 其他网关",
          }[preset.vendor]
        : {
            "deepseek-official": "DeepSeek Official",
            siliconflow: "SiliconFlow",
            ollama: "Ollama Local (No Key)",
            openrouter: "OpenRouter",
            qwen: "Aliyun Qwen (DashScope)",
            moonshot: "Moonshot (Kimi)",
            zhipu: "Zhipu AI (GLM-4)",
            anthropic: "Anthropic (Claude)",
            openai: "OpenAI",
            deepseek: "DeepSeek (Compatible)",
            custom: "Custom Gateway",
          }[preset.vendor],
  }));
}
