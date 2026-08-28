export type Locale = "zh" | "en";
export type Theme = "dark" | "light" | "system";
export type PresentationMode = "hyperion" | "compatibility" | "extended" | "advanced";
export type WindowMaterial = "mica" | "mica-alt" | "acrylic" | "glass" | "solid";
export type SceneId = "welcome" | "session" | "settings";
export type HarnessState = "idle" | "starting" | "ready" | "error";

export interface ProfileInfo {
  name: string;
  path: string;
  isActive: boolean;
  packageCount: number;
  bundleCount: number;
}

export interface CatalogSource {
  id: string;
  name: string;
  url: string;
  kind: "official" | "1024store" | "dshfind" | "custom";
  description?: string;
  enabled: boolean;
}

export interface RecentWorkspace {
  path: string;
  name: string;
  openedAt: string;
}

export interface AppSettings {
  harnessCommand: string;
  harnessArgs: string[];
  theme: Theme | string;
  locale: Locale | string;
  presentationMode: PresentationMode | string;
  windowMaterial: WindowMaterial | string;
  activeProfile: string;
  customPort?: number | null;
  lanExposed?: boolean;
  closeToTray: boolean;
  recentWorkspaces: RecentWorkspace[];
  agentChannel: string;
  agentAutoUpdate: boolean;
  autoStart: boolean;
  globalShortcutEnabled: boolean;
  dshHomeOverride?: string;
}

export interface StorageInfo {
  agentPrefixPath: string;
  agentPrefixSizeBytes: number;
  dshHomePath: string;
  dshHomeSizeBytes: number;
  configDirPath: string;
  configDirSizeBytes: number;
  cacheSizeBytes: number;
}

export interface HarnessStatus {
  state: HarnessState;
  url: string | null;
  workspace: string | null;
  pid: number | null;
  source: string | null;
  error: string | null;
  logTail: string[];
}

export interface Probe {
  found: boolean;
  path: string | null;
  version: string | null;
  error: string | null;
}

export interface AgentStatus {
  installedVersion: string | null;
  latestVersion: string | null;
  channel: string;
  updateAvailable: boolean;
  prefixPath: string;
  binaryPath: string | null;
  autoUpdate: boolean;
  error: string | null;
}

export interface ProviderKeysStatus {
  deepseek: boolean;
  openai: boolean;
  anthropic: boolean;
}

export interface ModelProvider {
  id: string;
  kind: string;
  displayName: string;
  baseUrl: string | null;
  api: string | null;
  apiKeyEnv: string;
  hasApiKey: boolean;
  models: string[];
}

export interface DefaultModel {
  provider: string;
  model: string;
}

export interface ModelProvidersSnapshot {
  providers: ModelProvider[];
  defaultModel: DefaultModel;
  dshHome: string;
}

export interface UpsertProviderInput {
  id: string;
  kind: string;
  displayName?: string | null;
  baseUrl?: string | null;
  api?: string | null;
  apiKeyEnv?: string | null;
  apiKey?: string | null;
  models: string[];
}

export interface PluginPackage {
  name: string;
  version: string;
  isBundle: boolean;
}

export interface McpServer {
  id: string;
  serverName: string;
  transport: string;
  command: string | null;
  args: string[];
  cwd: string | null;
  url: string | null;
  env: Record<string, string>;
  headers: Record<string, string>;
}

export interface PluginsSnapshot {
  profile: string;
  profilePath: string;
  dshHome: string;
  packages: PluginPackage[];
  bundles: string[];
  mcpServers: McpServer[];
}

export interface UpsertMcpInput {
  id: string;
  serverName: string;
  transport: string;
  command?: string | null;
  args: string[];
  cwd?: string | null;
  url?: string | null;
  env?: Record<string, string>;
  headers?: Record<string, string>;
}

export interface DoctorReport {
  node: Probe;
  dsh: Probe;
  npx: Probe;
  npm: Probe;
  hasApiKey: boolean;
  keyring: boolean;
  launchProgram: string;
  launchArgs: string[];
  launchSource: string;
  agent: AgentStatus;
  shellVersion: string;
}

export interface SettingsPatch {
  harnessCommand?: string;
  harnessArgs?: string[];
  theme?: string;
  locale?: string;
  presentationMode?: string;
  windowMaterial?: string;
  activeProfile?: string;
  customPort?: number | null;
  lanExposed?: boolean;
  closeToTray?: boolean;
  recentWorkspaces?: RecentWorkspace[];
  agentChannel?: string;
  agentAutoUpdate?: boolean;
  autoStart?: boolean;
  globalShortcutEnabled?: boolean;
  dshHomeOverride?: string;
}

export const IDLE_HARNESS: HarnessStatus = {
  state: "idle",
  url: null,
  workspace: null,
  pid: null,
  source: null,
  error: null,
  logTail: [],
};

export const IDLE_AGENT: AgentStatus = {
  installedVersion: null,
  latestVersion: null,
  channel: "latest",
  updateAvailable: false,
  prefixPath: "",
  binaryPath: null,
  autoUpdate: true,
  error: null,
};
