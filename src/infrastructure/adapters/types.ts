import type {
  AgentStatus,
  AppSettings,
  DefaultModel,
  DoctorReport,
  HarnessStatus,
  ModelProvidersSnapshot,
  PluginsSnapshot,
  ProviderKeysStatus,
  SettingsPatch,
  UpsertMcpInput,
  UpsertProviderInput,
} from "@/shared/types";

export interface HostAdapter {
  readonly isNative: boolean;
  pickWorkspaceDirectory(title: string): Promise<string | null>;
  getSettings(): Promise<AppSettings>;
  saveSettings(patch: SettingsPatch): Promise<AppSettings>;
  hasApiKey(): Promise<boolean>;
  getProviderKeysStatus(): Promise<ProviderKeysStatus>;
  setApiKey(key: string | null): Promise<boolean>;
  setProviderApiKey(provider: string, key: string | null): Promise<boolean>;
  listModelProviders(): Promise<ModelProvidersSnapshot>;
  upsertModelProvider(input: UpsertProviderInput): Promise<ModelProvidersSnapshot>;
  deleteModelProvider(providerId: string): Promise<ModelProvidersSnapshot>;
  setDefaultModel(provider: string, model: string): Promise<DefaultModel>;
  listPlugins(): Promise<PluginsSnapshot>;
  addPlugin(packageName: string): Promise<PluginsSnapshot>;
  removePlugin(packageName: string): Promise<PluginsSnapshot>;
  upsertMcpServer(input: UpsertMcpInput): Promise<PluginsSnapshot>;
  deleteMcpServer(serverId: string): Promise<PluginsSnapshot>;
  startHarness(workspace: string): Promise<HarnessStatus>;
  stopHarness(): Promise<void>;
  getHarnessStatus(): Promise<HarnessStatus>;
  subscribeHarnessStatus(onStatus: (status: HarnessStatus) => void): () => void;
  subscribeHarnessLog(onLine: (line: string) => void): () => void;
  subscribeAgentStatus(onStatus: (status: AgentStatus) => void): () => void;
  subscribeMaximized(onChange: (maximized: boolean) => void): () => void;
  doctor(): Promise<DoctorReport>;
  getAgentStatus(): Promise<AgentStatus>;
  updateAgent(): Promise<AgentStatus>;
  repairAgent(): Promise<AgentStatus>;
  minimizeWindow(): Promise<void>;
  toggleMaximizeWindow(): Promise<void>;
  closeWindow(): Promise<void>;
  startDragging(): Promise<void>;
  isMaximized(): Promise<boolean>;
  openExternal(url: string): Promise<void>;
  openInEditor(path: string, editor?: string): Promise<void>;
  openInTerminal(path: string): Promise<void>;
  revealInFileManager(path: string): Promise<void>;
  getStorageInfo(): Promise<import("@/shared/types").StorageInfo>;
  clearCache(): Promise<import("@/shared/types").StorageInfo>;
  openStorageDir(path: string): Promise<void>;
  listProfiles(): Promise<import("@/shared/types").ProfileInfo[]>;
  createProfile(name: string): Promise<import("@/shared/types").ProfileInfo>;
  deleteProfile(name: string): Promise<void>;
  switchProfile(name: string): Promise<import("@/shared/types").ProfileInfo[]>;
}

