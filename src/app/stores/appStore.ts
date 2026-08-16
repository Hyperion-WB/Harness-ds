import { create } from "zustand";
import { createHostAdapter, type HostAdapter } from "@/infrastructure/adapters/host";
import { createLogger } from "@/infrastructure/logger";
import {
  getGatewayClient,
  parseHistoryEvents,
} from "@/infrastructure/dshGatewayClient";
import type {
  ApprovalOutcome,
  ApprovalRequest,
  AskUserQuestionAnswer,
  AskUserQuestionItem,
  ChatMessage,
  SessionSummary,
} from "@/infrastructure/dshTypes";
import {
  IDLE_AGENT,
  IDLE_HARNESS,
  type AgentStatus,
  type AppSettings,
  type DefaultModel,
  type HarnessStatus,
  type Locale,
  type ModelProvider,
  type PluginPackage,
  type McpServer,
  type ProviderKeysStatus,
  type SceneId,
  type Theme,
  type UpsertMcpInput,
  type UpsertProviderInput,
} from "@/shared/types";

const log = createLogger("store");
let bootstrapped = false;

const EMPTY_PROVIDER_KEYS: ProviderKeysStatus = {
  deepseek: false,
  openai: false,
  anthropic: false,
};

const EMPTY_DEFAULT_MODEL: DefaultModel = {
  provider: "deepseek-official",
  model: "deepseek-chat",
};

function anyProviderKey(status: ProviderKeysStatus): boolean {
  return status.deepseek || status.openai || status.anthropic;
}

export interface AppStore {
  host: HostAdapter;
  ready: boolean;
  locale: Locale;
  theme: Theme;
  workspacePath: string | null;
  recentWorkspaces: AppSettings["recentWorkspaces"];
  activeScene: SceneId;
  navCollapsed: boolean;
  harness: HarnessStatus;
  hasApiKey: boolean;
  providerKeys: ProviderKeysStatus;
  modelProviders: ModelProvider[];
  defaultModel: DefaultModel;
  dshHome: string;
  pluginPackages: PluginPackage[];
  pluginBundles: string[];
  mcpServers: McpServer[];
  pluginProfilePath: string;
  closeToTray: boolean;
  harnessCommand: string;
  harnessArgs: string[];
  activePreset: string;
  agentChannel: string;
  agentAutoUpdate: boolean;
  autoStart: boolean;
  globalShortcutEnabled: boolean;
  agent: AgentStatus;
  logs: string[];
  isLogsDrawerOpen: boolean;
  sessionZoom: number;
  sessionReloadKey: number;
  errorBanner: string | null;
  sessionMounted: boolean;

  // Session state
  sessions: SessionSummary[];
  activeSessionId: string | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  pendingQuestions: AskUserQuestionItem[] | null;
  pendingQuestionRpcId: string | null;
  pendingApproval: ApprovalRequest | null;

  bootstrap: () => Promise<void>;
  setScene: (scene: SceneId) => void;
  toggleNav: () => void;
  toggleLogsDrawer: () => void;
  setLogsDrawerOpen: (open: boolean) => void;
  setSessionZoom: (zoom: number) => void;
  reloadSession: () => void;
  setActivePreset: (presetId: string) => Promise<void>;
  openWorkspace: (path?: string) => Promise<void>;
  restartHarness: () => Promise<void>;
  stopRuntime: () => Promise<void>;
  openInEditor: (path?: string, editor?: string) => Promise<void>;
  openInTerminal: (path?: string) => Promise<void>;
  revealInFileManager: (path?: string) => Promise<void>;
  applySettings: (patch: {
    theme?: Theme;
    locale?: Locale;
    closeToTray?: boolean;
    harnessCommand?: string;
    harnessArgs?: string[];
    agentChannel?: string;
    agentAutoUpdate?: boolean;
    autoStart?: boolean;
    globalShortcutEnabled?: boolean;
  }) => Promise<void>;

  saveApiKey: (key: string | null) => Promise<void>;
  saveProviderApiKey: (provider: keyof ProviderKeysStatus, key: string | null) => Promise<void>;
  refreshModelProviders: () => Promise<void>;
  upsertModelProvider: (input: UpsertProviderInput) => Promise<void>;
  deleteModelProvider: (providerId: string) => Promise<void>;
  setDefaultModel: (provider: string, model: string) => Promise<void>;
  refreshPlugins: () => Promise<void>;
  addPlugin: (packageName: string) => Promise<void>;
  removePlugin: (packageName: string) => Promise<void>;
  upsertMcpServer: (input: UpsertMcpInput) => Promise<void>;
  deleteMcpServer: (serverId: string) => Promise<void>;
  refreshAgentStatus: () => Promise<void>;
  updateAgentNow: () => Promise<void>;
  repairAgentNow: () => Promise<void>;
  setHarness: (status: HarnessStatus) => void;
  setAgent: (status: AgentStatus) => void;
  appendLog: (line: string) => void;
  clearLogs: () => void;
  clearBanner: () => void;

  // Session actions
  setSessions: (sessions: SessionSummary[]) => void;
  setActiveSessionId: (id: string | null) => void;
  setMessages: (messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  setIsStreaming: (streaming: boolean) => void;
  setPendingQuestions: (questions: AskUserQuestionItem[] | null, rpcId?: string | null) => void;
  setPendingApproval: (approval: ApprovalRequest | null) => void;
  createSession: (workspacePath?: string) => Promise<string | null>;
  selectSession: (sessionId: string) => Promise<void>;
  renameSession: (sessionId: string, newTitle: string) => Promise<void>;
  archiveSession: (sessionId: string) => Promise<void>;
  sendPrompt: (text: string) => Promise<void>;
  cancelGeneration: () => Promise<void>;
  respondToQuestion: (answers: AskUserQuestionAnswer[]) => Promise<void>;
  resolveApproval: (approvalId: string, outcome: ApprovalOutcome) => Promise<void>;
}

function asLocale(value: string | undefined): Locale {
  return value === "en" ? "en" : "zh";
}

function asTheme(value: string | undefined): Theme {
  if (value === "dark" || value === "light" || value === "system") {
    return value;
  }
  return "dark";
}

export const useAppStore = create<AppStore>((set, get) => ({
  host: createHostAdapter(),
  ready: false,
  locale: "zh",
  theme: "dark",
  workspacePath: null,
  recentWorkspaces: [],
  activeScene: "session",
  navCollapsed: false,
  harness: IDLE_HARNESS,
  hasApiKey: false,
  providerKeys: EMPTY_PROVIDER_KEYS,
  modelProviders: [],
  defaultModel: EMPTY_DEFAULT_MODEL,
  dshHome: "",
  pluginPackages: [],
  pluginBundles: [],
  mcpServers: [],
  pluginProfilePath: "",
  closeToTray: false,
  harnessCommand: "",
  harnessArgs: [],
  activePreset: "standard",
  agentChannel: "latest",
  agentAutoUpdate: true,
  autoStart: false,
  globalShortcutEnabled: true,
  agent: IDLE_AGENT,
  logs: [],
  isLogsDrawerOpen: false,
  sessionZoom: 100,
  sessionReloadKey: 0,
  errorBanner: null,
  sessionMounted: false,

  sessions: [],
  activeSessionId: null,
  messages: [],
  isStreaming: false,
  pendingQuestions: null,
  pendingQuestionRpcId: null,
  pendingApproval: null,

  async bootstrap() {
    if (bootstrapped) return;
    bootstrapped = true;
    const { host } = get();
    host.subscribeHarnessStatus((status) => get().setHarness(status));
    host.subscribeHarnessLog((line) => get().appendLog(line));
    host.subscribeAgentStatus((status) => get().setAgent(status));
    try {
      const [settings, providerKeys, modelSnapshot, harness, agent] = await Promise.all([
        host.getSettings(),
        host.getProviderKeysStatus(),
        host.listModelProviders().catch(() => ({
          providers: [],
          defaultModel: EMPTY_DEFAULT_MODEL,
          dshHome: "",
        })),
        host.getHarnessStatus(),
        host.getAgentStatus().catch(() => IDLE_AGENT),
      ]);
      const args = settings.harnessArgs ?? [];
      const presetIdx = args.indexOf("--preset");
      const activePreset = presetIdx !== -1 && args[presetIdx + 1] ? args[presetIdx + 1] : "standard";

      const defaultWorkspace = harness.workspace || settings.recentWorkspaces?.[0]?.path || null;

      set({
        ready: true,
        locale: asLocale(settings.locale),
        theme: asTheme(settings.theme),
        recentWorkspaces: settings.recentWorkspaces,
        providerKeys,
        modelProviders: modelSnapshot.providers,
        defaultModel: modelSnapshot.defaultModel,
        dshHome: modelSnapshot.dshHome,
        hasApiKey:
          anyProviderKey(providerKeys) || modelSnapshot.providers.some((item) => item.hasApiKey),
        closeToTray: settings.closeToTray,
        harnessCommand: settings.harnessCommand,
        harnessArgs: args,
        activePreset,
        agentChannel: settings.agentChannel ?? "latest",
        agentAutoUpdate: settings.agentAutoUpdate ?? true,
        autoStart: settings.autoStart ?? false,
        globalShortcutEnabled: settings.globalShortcutEnabled ?? true,
        harness,
        agent,
        workspacePath: defaultWorkspace,
        activeScene: "session",
        sessionMounted: true,
      });

      // If we have a workspace and harness is ready, load sessions
      if (harness.state === "ready" && harness.url) {
        const client = getGatewayClient(harness.url);
        if (client) {
          const res = await client.listSessions().catch(() => ({ items: [] }));
          const items = res.items || [];
          set({ sessions: items });
          if (items.length > 0) {
            void get().selectSession(items[0].sessionId);
          }
        }
      } else if (defaultWorkspace && anyProviderKey(providerKeys)) {
        // Auto-start harness in the background for instant Claude-like readiness
        void host.startHarness(defaultWorkspace).then((s) => get().setHarness(s)).catch(() => {});
      }
    } catch (error) {
      log.error("bootstrap failed", error);
      set({ ready: true, errorBanner: String(error) });
    }
  },

  setScene(scene) {
    set({ activeScene: scene });
  },

  toggleNav() {
    set({ navCollapsed: !get().navCollapsed });
  },

  toggleLogsDrawer() {
    set({ isLogsDrawerOpen: !get().isLogsDrawerOpen });
  },

  setLogsDrawerOpen(open) {
    set({ isLogsDrawerOpen: open });
  },

  setSessionZoom(zoom) {
    set({ sessionZoom: zoom });
  },

  reloadSession() {
    set({ sessionReloadKey: get().sessionReloadKey + 1 });
  },

  async setActivePreset(presetId) {
    const nextArgs = [...get().harnessArgs];
    const presetIdx = nextArgs.indexOf("--preset");
    if (presetIdx !== -1) {
      nextArgs[presetIdx + 1] = presetId;
    } else {
      nextArgs.push("--preset", presetId);
    }
    await get().applySettings({ harnessArgs: nextArgs });
    set({ activePreset: presetId, harnessArgs: nextArgs });
  },

  async openWorkspace(path) {
    const { host, workspacePath, harness } = get();
    let hasKey = get().hasApiKey;
    try {
      const [hostKey, modelSnapshot] = await Promise.all([
        host.hasApiKey(),
        host.listModelProviders(),
      ]);
      hasKey =
        hostKey ||
        get().hasApiKey ||
        modelSnapshot.providers.some((item) => item.hasApiKey);
      if (hasKey !== get().hasApiKey) {
        set({ hasApiKey: hasKey });
      }
    } catch {
      /* keep cached flag */
    }
    if (!hasKey) {
      set({ activeScene: "settings", errorBanner: "need-key" });
      return;
    }
    try {
      const selected = path ?? (await host.pickWorkspaceDirectory("选择工作区"));
      if (!selected) return;

      if (
        selected === workspacePath &&
        harness.state === "ready" &&
        harness.url &&
        harness.workspace === selected
      ) {
        set({ activeScene: "session", sessionMounted: true, errorBanner: null });
        return;
      }

      set({
        workspacePath: selected,
        activeScene: "session",
        sessionMounted: true,
        errorBanner: null,
        harness: { ...IDLE_HARNESS, state: "starting", workspace: selected },
      });
      const status = await host.startHarness(selected);
      get().setHarness(status);
      const settings = await host.getSettings();
      set({ recentWorkspaces: settings.recentWorkspaces });
      void get().refreshAgentStatus();
    } catch (error) {
      log.error("open workspace failed", error);
      set({
        errorBanner: String(error),
        harness: {
          ...IDLE_HARNESS,
          state: "error",
          error: String(error),
          workspace: get().workspacePath,
        },
      });
    }
  },

  async restartHarness() {
    const path = get().workspacePath;
    if (!path) return;
    set({
      harness: { ...IDLE_HARNESS, state: "starting", workspace: path },
      sessionMounted: true,
      activeScene: "session",
    });
    try {
      await get().host.stopHarness();
      const status = await get().host.startHarness(path);
      get().setHarness(status);
    } catch (error) {
      set({
        harness: {
          ...IDLE_HARNESS,
          state: "error",
          error: String(error),
          workspace: path,
        },
      });
    }
  },

  async stopRuntime() {
    await get().host.stopHarness();
    set({ harness: IDLE_HARNESS, sessionMounted: false });
  },

  async applySettings(patch) {
    const settings = await get().host.saveSettings(patch);
    const args = settings.harnessArgs ?? get().harnessArgs;
    const presetIdx = args.indexOf("--preset");
    const activePreset = presetIdx !== -1 && args[presetIdx + 1] ? args[presetIdx + 1] : get().activePreset;

    set({
      locale: asLocale(settings.locale),
      theme: asTheme(settings.theme),
      closeToTray: settings.closeToTray,
      harnessCommand: settings.harnessCommand,
      harnessArgs: args,
      activePreset,
      agentChannel: settings.agentChannel ?? "latest",
      agentAutoUpdate: settings.agentAutoUpdate ?? true,
      autoStart: settings.autoStart ?? false,
      globalShortcutEnabled: settings.globalShortcutEnabled ?? true,
      recentWorkspaces: settings.recentWorkspaces,
    });
  },

  async saveApiKey(key) {
    await get().saveProviderApiKey("deepseek", key);
  },

  async saveProviderApiKey(provider, key) {
    await get().host.setProviderApiKey(provider, key);
    const providerKeys = await get().host.getProviderKeysStatus();
    const modelSnapshot = await get().host.listModelProviders().catch(() => null);
    set({
      providerKeys,
      hasApiKey:
        anyProviderKey(providerKeys) ||
        Boolean(modelSnapshot?.providers.some((item) => item.hasApiKey)),
      errorBanner: null,
      ...(modelSnapshot
        ? {
            modelProviders: modelSnapshot.providers,
            defaultModel: modelSnapshot.defaultModel,
            dshHome: modelSnapshot.dshHome,
          }
        : {}),
    });
  },

  async refreshModelProviders() {
    try {
      const snapshot = await get().host.listModelProviders();
      const providerKeys = await get().host.getProviderKeysStatus();
      const hasApiKey =
        anyProviderKey(providerKeys) || snapshot.providers.some((item) => item.hasApiKey);
      set({
        modelProviders: snapshot.providers,
        defaultModel: snapshot.defaultModel,
        dshHome: snapshot.dshHome,
        providerKeys,
        hasApiKey,
        errorBanner: hasApiKey && get().errorBanner === "need-key" ? null : get().errorBanner,
      });
    } catch (error) {
      log.error("model providers failed", error);
    }
  },

  async upsertModelProvider(input) {
    const snapshot = await get().host.upsertModelProvider(input);
    const providerKeys = await get().host.getProviderKeysStatus();
    set({
      modelProviders: snapshot.providers,
      defaultModel: snapshot.defaultModel,
      dshHome: snapshot.dshHome,
      providerKeys,
      hasApiKey:
        anyProviderKey(providerKeys) || snapshot.providers.some((item) => item.hasApiKey),
      errorBanner: null,
    });
  },

  async deleteModelProvider(providerId) {
    const snapshot = await get().host.deleteModelProvider(providerId);
    const providerKeys = await get().host.getProviderKeysStatus();
    set({
      modelProviders: snapshot.providers,
      defaultModel: snapshot.defaultModel,
      dshHome: snapshot.dshHome,
      providerKeys,
      hasApiKey:
        anyProviderKey(providerKeys) || snapshot.providers.some((item) => item.hasApiKey),
    });
  },

  async setDefaultModel(provider, model) {
    const defaultModel = await get().host.setDefaultModel(provider, model);
    set({ defaultModel });
  },

  async refreshPlugins() {
    try {
      const snapshot = await get().host.listPlugins();
      set({
        pluginPackages: snapshot.packages,
        pluginBundles: snapshot.bundles,
        mcpServers: snapshot.mcpServers,
        pluginProfilePath: snapshot.profilePath,
      });
    } catch (error) {
      log.error("plugins failed", error);
    }
  },

  async addPlugin(packageName) {
    const snapshot = await get().host.addPlugin(packageName);
    set({
      pluginPackages: snapshot.packages,
      pluginBundles: snapshot.bundles,
      mcpServers: snapshot.mcpServers,
      pluginProfilePath: snapshot.profilePath,
    });
  },

  async removePlugin(packageName) {
    const snapshot = await get().host.removePlugin(packageName);
    set({
      pluginPackages: snapshot.packages,
      pluginBundles: snapshot.bundles,
      mcpServers: snapshot.mcpServers,
      pluginProfilePath: snapshot.profilePath,
    });
  },

  async upsertMcpServer(input) {
    const snapshot = await get().host.upsertMcpServer(input);
    set({
      pluginPackages: snapshot.packages,
      pluginBundles: snapshot.bundles,
      mcpServers: snapshot.mcpServers,
      pluginProfilePath: snapshot.profilePath,
    });
  },

  async deleteMcpServer(serverId) {
    const snapshot = await get().host.deleteMcpServer(serverId);
    set({
      pluginPackages: snapshot.packages,
      pluginBundles: snapshot.bundles,
      mcpServers: snapshot.mcpServers,
      pluginProfilePath: snapshot.profilePath,
    });
  },

  async refreshAgentStatus() {
    try {
      const agent = await get().host.getAgentStatus();
      set({ agent });
    } catch (error) {
      log.error("agent status failed", error);
    }
  },

  async updateAgentNow() {
    set({ errorBanner: null });
    try {
      const agent = await get().host.updateAgent();
      set({ agent });
      const harness = await get().host.getHarnessStatus();
      get().setHarness(harness);
    } catch (error) {
      const msg = String(error);
      set({ errorBanner: msg });
      throw error;
    }
  },

  async repairAgentNow() {
    set({ errorBanner: null });
    try {
      const agent = await get().host.repairAgent();
      set({ agent });
      const harness = await get().host.getHarnessStatus();
      get().setHarness(harness);
    } catch (error) {
      const msg = String(error);
      set({ errorBanner: msg });
      throw error;
    }
  },

  async openInEditor(path, editor) {
    const target = path ?? get().workspacePath;
    if (target) {
      await get().host.openInEditor(target, editor);
    }
  },

  async openInTerminal(path) {
    const target = path ?? get().workspacePath;
    if (target) {
      await get().host.openInTerminal(target);
    }
  },

  async revealInFileManager(path) {
    const target = path ?? get().workspacePath;
    if (target) {
      await get().host.revealInFileManager(target);
    }
  },

  setHarness(status) {
    set({
      harness: status,
      workspacePath: status.workspace ?? get().workspacePath,
      sessionMounted: status.state === "ready" || get().sessionMounted,
    });
    if (status.state === "ready" && status.url) {
      const client = getGatewayClient(status.url);
      if (client) {
        void client.listSessions().then((res) => {
          const items = res.items || [];
          set({ sessions: items });
          if (!get().activeSessionId && items.length > 0) {
            void get().selectSession(items[0].sessionId);
          }
        }).catch(() => {});
      }
    }
  },

  setAgent(status) {
    set({ agent: status });
  },

  appendLog(line) {
    const logs = [...get().logs, line].slice(-500);
    set({ logs });
  },

  clearLogs() {
    set({ logs: [] });
  },

  clearBanner() {
    set({ errorBanner: null });
  },

  // Session actions implementation
  setSessions(sessions) {
    set({ sessions });
  },

  setActiveSessionId(id) {
    set({ activeSessionId: id });
  },

  setMessages(messages) {
    set((state) => ({
      messages: typeof messages === "function" ? messages(state.messages) : messages,
    }));
  },

  setIsStreaming(streaming) {
    set({ isStreaming: streaming });
  },

  setPendingQuestions(questions, rpcId = null) {
    set({ pendingQuestions: questions, pendingQuestionRpcId: rpcId });
  },

  setPendingApproval(approval) {
    set({ pendingApproval: approval });
  },

  async createSession(workspacePath) {
    const ws = workspacePath ?? get().workspacePath;
    const harness = get().harness;
    if (!ws) {
      await get().openWorkspace();
      return null;
    }
    if (harness.state === "ready" && harness.url) {
      const client = getGatewayClient(harness.url);
      if (client) {
        try {
          const created = await client.createSession(ws, get().activePreset);
          const list = await client.listSessions();
          set({
            sessions: list.items || [],
            activeSessionId: created.sessionId,
            messages: [],
            activeScene: "session",
          });
          return created.sessionId;
        } catch (e) {
          log.error("Create session failed", e);
        }
      }
    } else {
      // Auto-start harness if not ready
      await get().openWorkspace(ws);
    }
    return null;
  },

  async selectSession(sessionId) {
    set({ activeSessionId: sessionId, activeScene: "session", messages: [] });
    const harness = get().harness;
    if (harness.state === "ready" && harness.url) {
      const client = getGatewayClient(harness.url);
      if (client) {
        try {
          const history: any = await client.getSessionHistory(sessionId);
          if (history && Array.isArray(history.events)) {
            const parsed = parseHistoryEvents(history.events);
            set({ messages: parsed });
          }
        } catch (e) {
          log.error("Failed to load session history", e);
        }
      }
    }
  },

  async renameSession(sessionId, newTitle) {
    const harness = get().harness;
    if (harness.state === "ready" && harness.url) {
      const client = getGatewayClient(harness.url);
      if (client) {
        try {
          await client.renameSession(sessionId, newTitle);
          const list = await client.listSessions();
          set({ sessions: list.items || [] });
        } catch (e) {
          log.error("Rename session failed", e);
        }
      }
    }
  },

  async archiveSession(sessionId) {
    const harness = get().harness;
    if (harness.state === "ready" && harness.url) {
      const client = getGatewayClient(harness.url);
      if (client) {
        try {
          await client.archiveSession(sessionId);
          const list = await client.listSessions();
          const items = list.items || [];
          const current = get().activeSessionId;
          const nextActive = current === sessionId ? (items[0]?.sessionId || null) : current;
          set({ sessions: items, activeSessionId: nextActive });
          if (nextActive && nextActive !== sessionId) {
            void get().selectSession(nextActive);
          } else if (!nextActive) {
            set({ messages: [] });
          }
        } catch (e) {
          log.error("Archive session failed", e);
        }
      }
    }
  },

  async sendPrompt(text) {
    const { activeSessionId, harness, workspacePath, activePreset } = get();
    let client: any = null;
    let sessId = activeSessionId;

    if (harness.state === "ready" && harness.url) {
      client = getGatewayClient(harness.url);
    }

    if (!client) {
      if (workspacePath) {
        await get().openWorkspace(workspacePath);
      }
      return;
    }

    if (!sessId) {
      const created = await client.createSession(workspacePath || ".", activePreset);
      sessId = created.sessionId;
      const list = await client.listSessions();
      set({ sessions: list.items || [], activeSessionId: sessId });
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      createdAt: Date.now(),
    };

    const assistantMsg: ChatMessage = {
      id: `asst-${Date.now()}`,
      role: "assistant",
      content: "",
      createdAt: Date.now() + 1,
      isStreaming: true,
    };

    set((state) => ({
      messages: [...state.messages, userMsg, assistantMsg],
      isStreaming: true,
    }));

    try {
      await client.sendPrompt(sessId, text);
    } catch (e) {
      log.error("Send prompt failed", e);
      set((state) => ({
        isStreaming: false,
        messages: state.messages.map((m, idx) =>
          idx === state.messages.length - 1
            ? { ...m, isStreaming: false, error: String(e) }
            : m,
        ),
      }));
    }
  },

  async cancelGeneration() {
    const { activeSessionId, harness } = get();
    if (!activeSessionId || harness.state !== "ready" || !harness.url) return;
    const client = getGatewayClient(harness.url);
    if (client) {
      try {
        await client.cancelSession(activeSessionId);
        set({ isStreaming: false });
      } catch (e) {
        log.error("Cancel generation failed", e);
      }
    }
  },

  async respondToQuestion(answers) {
    const { activeSessionId, pendingQuestionRpcId, harness } = get();
    if (!activeSessionId || harness.state !== "ready" || !harness.url) return;
    const client = getGatewayClient(harness.url);
    if (client) {
      try {
        await client.respondToQuestion(
          pendingQuestionRpcId || `resp-${Date.now()}`,
          activeSessionId,
          answers,
        );
        set({ pendingQuestions: null, pendingQuestionRpcId: null });
      } catch (e) {
        log.error("Respond question failed", e);
      }
    }
  },

  async resolveApproval(approvalId, outcome) {
    const { harness } = get();
    if (harness.state !== "ready" || !harness.url) return;
    const client = getGatewayClient(harness.url);
    if (client) {
      try {
        await client.resolveApproval(approvalId, outcome);
        set({ pendingApproval: null });
      } catch (e) {
        log.error("Resolve approval failed", e);
      }
    }
  },
}));
