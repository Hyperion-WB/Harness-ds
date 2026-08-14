import {
  IDLE_AGENT,
  IDLE_HARNESS,
  type AgentStatus,
  type AppSettings,
  type HarnessStatus,
  type ModelProvider,
  type ModelProvidersSnapshot,
  type ProviderKeysStatus,
  type UpsertProviderInput,
} from "@/shared/types";
import type { HostAdapter } from "./types";

const SETTINGS_KEY = "dshg.settings";
const KEY_PREFIX = "dshg.apiKey.";
const LEGACY_KEY = "dshg.apiKey";
const MODELS_KEY = "dshg.modelProviders";
const PROVIDERS = ["deepseek", "openai", "anthropic"] as const;

function keyStorageId(provider: string): string {
  return `${KEY_PREFIX}${provider}`;
}

function readProviderKeys(): ProviderKeysStatus {
  if (typeof localStorage === "undefined") {
    return { deepseek: false, openai: false, anthropic: false };
  }
  const legacy = Boolean(localStorage.getItem(LEGACY_KEY));
  return {
    deepseek: Boolean(localStorage.getItem(keyStorageId("deepseek"))) || legacy,
    openai: Boolean(localStorage.getItem(keyStorageId("openai"))),
    anthropic: Boolean(localStorage.getItem(keyStorageId("anthropic"))),
  };
}

function emptySnapshot(): ModelProvidersSnapshot {
  return {
    providers: [],
    defaultModel: { provider: "deepseek-official", model: "deepseek-v4-flash" },
    dshHome: "browser-preview",
  };
}

function readModels(): ModelProvidersSnapshot {
  if (typeof localStorage === "undefined") return emptySnapshot();
  const raw = localStorage.getItem(MODELS_KEY);
  if (!raw) return emptySnapshot();
  try {
    return { ...emptySnapshot(), ...(JSON.parse(raw) as ModelProvidersSnapshot) };
  } catch {
    return emptySnapshot();
  }
}

function writeModels(snapshot: ModelProvidersSnapshot): void {
  localStorage.setItem(MODELS_KEY, JSON.stringify(snapshot));
}

const defaultSettings = (): AppSettings => ({
  harnessCommand: "",
  harnessArgs: [],
  theme: "dark",
  locale: "zh",
  closeToTray: false,
  recentWorkspaces: [],
  agentChannel: "latest",
  agentAutoUpdate: true,
  autoStart: false,
  globalShortcutEnabled: true,
});

function readSettings(): AppSettings {
  if (typeof localStorage === "undefined") return defaultSettings();
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) return defaultSettings();
  try {
    return { ...defaultSettings(), ...(JSON.parse(raw) as AppSettings) };
  } catch {
    return defaultSettings();
  }
}

function writeSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export const webAdapter: HostAdapter = {
  isNative: false,

  async pickWorkspaceDirectory() {
    return window.prompt("输入工作区绝对路径") || null;
  },

  async getSettings() {
    return readSettings();
  },

  async saveSettings(patch) {
    const next = { ...readSettings(), ...patch };
    writeSettings(next);
    return next;
  },

  async hasApiKey() {
    const status = readProviderKeys();
    const models = readModels();
    return (
      status.deepseek ||
      status.openai ||
      status.anthropic ||
      models.providers.some((provider) => provider.hasApiKey)
    );
  },

  async getProviderKeysStatus() {
    return readProviderKeys();
  },

  async setApiKey(key) {
    return this.setProviderApiKey("deepseek", key);
  },

  async setProviderApiKey(provider, key) {
    if (!PROVIDERS.includes(provider as (typeof PROVIDERS)[number])) {
      throw new Error(`未知提供商: ${provider}`);
    }
    const id = keyStorageId(provider);
    if (key) localStorage.setItem(id, key);
    else localStorage.removeItem(id);
    if (provider === "deepseek") localStorage.removeItem(LEGACY_KEY);
    return false;
  },

  async listModelProviders() {
    return readModels();
  },

  async upsertModelProvider(input: UpsertProviderInput) {
    const current = readModels();
    const id = input.id.trim().toLowerCase();
    const existing = current.providers.find((item) => item.id === id);
    const hasApiKey = Boolean(input.apiKey?.trim()) || Boolean(existing?.hasApiKey);
    const nextProvider: ModelProvider = {
      id,
      kind: input.kind,
      displayName: input.displayName?.trim() || id,
      baseUrl: input.baseUrl ?? null,
      api: input.api ?? null,
      apiKeyEnv: input.apiKeyEnv?.trim() || `${id.replace(/-/g, "_").toUpperCase()}_API_KEY`,
      hasApiKey,
      models: input.models,
    };
    const providers = [...current.providers.filter((item) => item.id !== id), nextProvider];
    const snapshot = { ...current, providers };
    writeModels(snapshot);
    if (input.apiKey?.trim() && ["DEEPSEEK_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY"].includes(nextProvider.apiKeyEnv)) {
      const map: Record<string, string> = {
        DEEPSEEK_API_KEY: "deepseek",
        OPENAI_API_KEY: "openai",
        ANTHROPIC_API_KEY: "anthropic",
      };
      await this.setProviderApiKey(map[nextProvider.apiKeyEnv], input.apiKey.trim());
    }
    return snapshot;
  },

  async deleteModelProvider(providerId) {
    const current = readModels();
    const snapshot = {
      ...current,
      providers: current.providers.filter((item) => item.id !== providerId),
    };
    writeModels(snapshot);
    return snapshot;
  },

  async setDefaultModel(provider, model) {
    const current = readModels();
    const defaultModel = { provider, model };
    writeModels({ ...current, defaultModel });
    return defaultModel;
  },

  async listPlugins() {
    return {
      profile: "web",
      profilePath: "browser-preview",
      dshHome: "browser-preview",
      packages: [],
      bundles: [],
      mcpServers: [],
    };
  },

  async addPlugin() {
    throw new Error("浏览器预览无法安装插件。请运行桌面端。");
  },

  async removePlugin() {
    throw new Error("浏览器预览无法移除插件。请运行桌面端。");
  },

  async upsertMcpServer() {
    throw new Error("浏览器预览无法配置 MCP。请运行桌面端。");
  },

  async deleteMcpServer() {
    throw new Error("浏览器预览无法配置 MCP。请运行桌面端。");
  },

  async startHarness(): Promise<HarnessStatus> {
    throw new Error("浏览器预览无法启动 dsh web。请运行 pnpm desktop:dev。");
  },

  async stopHarness() {},

  async getHarnessStatus() {
    return IDLE_HARNESS;
  },

  subscribeHarnessStatus() {
    return () => undefined;
  },

  subscribeHarnessLog() {
    return () => undefined;
  },

  subscribeAgentStatus() {
    return () => undefined;
  },

  subscribeMaximized() {
    return () => undefined;
  },

  async doctor() {
    return {
      node: { found: false, path: null, version: null, error: "web preview" },
      dsh: { found: false, path: null, version: null, error: "web preview" },
      npx: { found: false, path: null, version: null, error: "web preview" },
      npm: { found: false, path: null, version: null, error: "web preview" },
      hasApiKey: await this.hasApiKey(),
      keyring: false,
      launchProgram: "",
      launchArgs: [],
      launchSource: "web",
      agent: IDLE_AGENT,
      shellVersion: "0.1.0",
    };
  },

  async getAgentStatus(): Promise<AgentStatus> {
    return IDLE_AGENT;
  },

  async updateAgent(): Promise<AgentStatus> {
    return IDLE_AGENT;
  },

  async minimizeWindow() {},
  async toggleMaximizeWindow() {},
  async closeWindow() {},
  async startDragging() {},
  async isMaximized() {
    return false;
  },
  async openExternal(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
  },
  async openInEditor(path: string, editor?: string) {
    console.info(`[WebPreview] Open in ${editor ?? "editor"}:`, path);
  },
  async openInTerminal(path: string) {
    console.info("[WebPreview] Open in terminal:", path);
  },
  async revealInFileManager(path: string) {
    console.info("[WebPreview] Reveal in file manager:", path);
  },
};

