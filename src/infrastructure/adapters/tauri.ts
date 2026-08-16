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
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { HostAdapter } from "./types";

export const tauriAdapter: HostAdapter = {
  isNative: true,

  pickWorkspaceDirectory() {
    return invoke<string | null>("pick_workspace");
  },

  getSettings() {
    return invoke<AppSettings>("get_settings");
  },

  saveSettings(patch: SettingsPatch) {
    return invoke<AppSettings>("save_settings_patch", { patch });
  },

  hasApiKey() {
    return invoke<boolean>("get_api_key_present");
  },

  getProviderKeysStatus() {
    return invoke<ProviderKeysStatus>("get_provider_keys_status");
  },

  setApiKey(key: string | null) {
    return invoke<boolean>("set_stored_api_key", { key });
  },

  setProviderApiKey(provider: string, key: string | null) {
    return invoke<boolean>("set_provider_api_key", { provider, key });
  },

  listModelProviders() {
    return invoke<ModelProvidersSnapshot>("list_model_providers");
  },

  upsertModelProvider(input: UpsertProviderInput) {
    return invoke<ModelProvidersSnapshot>("upsert_model_provider", { input });
  },

  deleteModelProvider(providerId: string) {
    return invoke<ModelProvidersSnapshot>("delete_model_provider", { providerId });
  },

  setDefaultModel(provider: string, model: string) {
    return invoke<DefaultModel>("set_default_model", { provider, model });
  },

  listPlugins() {
    return invoke<PluginsSnapshot>("list_plugins");
  },

  addPlugin(packageName: string) {
    return invoke<PluginsSnapshot>("add_plugin", { package: packageName });
  },

  removePlugin(packageName: string) {
    return invoke<PluginsSnapshot>("remove_plugin", { package: packageName });
  },

  upsertMcpServer(input: UpsertMcpInput) {
    return invoke<PluginsSnapshot>("upsert_mcp_server", { input });
  },

  deleteMcpServer(serverId: string) {
    return invoke<PluginsSnapshot>("delete_mcp_server", { serverId });
  },

  startHarness(workspace: string) {
    return invoke<HarnessStatus>("start_harness", { workspace });
  },

  stopHarness() {
    return invoke<void>("stop_harness");
  },

  getHarnessStatus() {
    return invoke<HarnessStatus>("harness_status");
  },

  subscribeHarnessStatus(onStatus) {
    const unlisten = listen<HarnessStatus>("harness://status", (event) => {
      onStatus(event.payload);
    });
    return () => {
      void unlisten.then((fn) => fn());
    };
  },

  subscribeHarnessLog(onLine) {
    const unlisten = listen<string>("harness://log", (event) => {
      onLine(event.payload);
    });
    return () => {
      void unlisten.then((fn) => fn());
    };
  },

  subscribeAgentStatus(onStatus) {
    const unsubs: Array<() => void> = [];
    for (const eventName of ["agent://status", "agent://update-available", "agent://updated"] as const) {
      const unlisten = listen<AgentStatus>(eventName, (event) => {
        onStatus(event.payload);
      });
      unsubs.push(() => {
        void unlisten.then((fn) => fn());
      });
    }
    return () => {
      for (const unsub of unsubs) unsub();
    };
  },

  subscribeMaximized(onChange) {
    const windowRef = getCurrentWindow();
    const unlisten = windowRef.onResized(() => {
      void windowRef.isMaximized().then(onChange);
    });
    return () => {
      void unlisten.then((fn) => fn());
    };
  },

  doctor() {
    return invoke<DoctorReport>("doctor");
  },

  getAgentStatus() {
    return invoke<AgentStatus>("get_agent_status");
  },

  updateAgent() {
    return invoke<AgentStatus>("update_agent");
  },

  repairAgent() {
    return invoke<AgentStatus>("repair_agent");
  },

  async minimizeWindow() {
    await getCurrentWindow().minimize();
  },

  async toggleMaximizeWindow() {
    await getCurrentWindow().toggleMaximize();
  },

  async closeWindow() {
    await getCurrentWindow().close();
  },

  async startDragging() {
    await getCurrentWindow().startDragging();
  },

  isMaximized() {
    return getCurrentWindow().isMaximized();
  },

  async openExternal(url: string) {
    await openUrl(url);
  },

  async openInEditor(path: string, editor?: string) {
    await invoke<void>("open_in_editor", { path, editor });
  },

  async openInTerminal(path: string) {
    await invoke<void>("open_in_terminal", { path });
  },

  async revealInFileManager(path: string) {
    await invoke<void>("reveal_in_file_manager", { path });
  },

  async getStorageInfo() {
    return invoke<import("@/shared/types").StorageInfo>("get_storage_info");
  },

  async clearCache() {
    return invoke<import("@/shared/types").StorageInfo>("clear_cache");
  },

  async openStorageDir(path: string) {
    await invoke<void>("open_storage_dir", { path });
  },
};

