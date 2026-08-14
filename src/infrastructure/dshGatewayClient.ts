import { createLogger } from "./logger";
import type {
  AskUserQuestionAnswer,
  ApprovalOutcome,
  HostFrame,
  MuxFrame,
  SessionSummary,
  WorkspaceListResult,
  WorkspaceView,
} from "./dshTypes";

const log = createLogger("gateway-client");

export interface GatewayClientConfig {
  baseUrl: string;
  onMuxFrame?: (frame: MuxFrame) => void;
  onHostFrame?: (frame: HostFrame) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export class DshGatewayClient {
  private baseUrl: string;
  private muxWs: WebSocket | null = null;
  private hostWs: WebSocket | null = null;
  private muxListeners: Set<(frame: MuxFrame) => void> = new Set();
  private hostListeners: Set<(frame: HostFrame) => void> = new Set();
  private connectionListeners: Set<(connected: boolean) => void> = new Set();
  private isConnected = false;
  private isDisposed = false;
  private reconnectTimer: number | null = null;
  private pollTimer: number | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  public getUrl(): string {
    return this.baseUrl;
  }

  public connect(): void {
    if (this.isDisposed) return;
    // 1. Immediately verify HTTP RPC connectivity
    void this.pingHttp();
    // 2. Initialize WebSockets for real-time streaming
    this.initMuxWs();
    this.initHostWs();
    // 3. Start background health poll
    this.startHttpPolling();
  }

  public disconnect(): void {
    this.isDisposed = true;
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pollTimer) {
      window.clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.muxWs) {
      try {
        this.muxWs.close();
      } catch {}
      this.muxWs = null;
    }
    if (this.hostWs) {
      try {
        this.hostWs.close();
      } catch {}
      this.hostWs = null;
    }
    this.setConnected(false);
  }

  private setConnected(connected: boolean): void {
    if (this.isConnected !== connected) {
      this.isConnected = connected;
      for (const listener of this.connectionListeners) {
        try {
          listener(connected);
        } catch (e) {
          log.error("connection listener error", e);
        }
      }
    }
  }

  public async pingHttp(): Promise<boolean> {
    try {
      await this.listSessions();
      this.setConnected(true);
      return true;
    } catch {
      try {
        await this.listWorkspaces();
        this.setConnected(true);
        return true;
      } catch {
        return false;
      }
    }
  }

  private startHttpPolling(): void {
    if (this.pollTimer) return;
    this.pollTimer = window.setInterval(() => {
      if (this.isDisposed) return;
      void this.pingHttp();
    }, 4000);
  }

  private initMuxWs(): void {
    if (this.isDisposed) return;
    const wsUrl = this.baseUrl.replace(/^http:\/\//i, "ws://").replace(/^https:\/\//i, "wss://") + "/api/events.mux";
    try {
      this.muxWs = new WebSocket(wsUrl);
      this.muxWs.onopen = () => {
        log.info("Mux WebSocket connected");
        this.setConnected(true);
      };
      this.muxWs.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          let frame: MuxFrame | null = null;
          if (raw && typeof raw === "object") {
            if (raw.type === "server-request" && raw.payload) {
              frame = raw.payload as MuxFrame;
            } else if (raw.type && typeof raw.type === "string") {
              frame = raw as MuxFrame;
            }
          }
          if (frame) {
            for (const listener of this.muxListeners) {
              try {
                listener(frame);
              } catch (err) {
                log.error("mux frame listener error", err);
              }
            }
          }
        } catch (err) {
          log.error("Error parsing mux WS message", err);
        }
      };
      this.muxWs.onclose = () => {
        log.info("Mux WebSocket closed, reconnecting in 2s...");
        this.scheduleReconnect();
      };
      this.muxWs.onerror = (err) => {
        log.error("Mux WebSocket error", err);
      };
    } catch (e) {
      log.error("Failed to connect Mux WS", e);
      this.scheduleReconnect();
    }
  }

  private initHostWs(): void {
    if (this.isDisposed) return;
    const wsUrl = this.baseUrl.replace(/^http:\/\//i, "ws://").replace(/^https:\/\//i, "wss://") + "/api/events.host";
    try {
      this.hostWs = new WebSocket(wsUrl);
      this.hostWs.onopen = () => {
        log.info("Host WebSocket connected");
      };
      this.hostWs.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          let frame: HostFrame | null = null;
          if (raw && typeof raw === "object") {
            if (raw.type === "server-request" && raw.payload) {
              frame = raw.payload as HostFrame;
            } else if (raw.type && typeof raw.type === "string") {
              frame = raw as HostFrame;
            }
          }
          if (frame) {
            for (const listener of this.hostListeners) {
              try {
                listener(frame);
              } catch (err) {
                log.error("host frame listener error", err);
              }
            }
          }
        } catch (err) {
          log.error("Error parsing host WS message", err);
        }
      };
      this.hostWs.onclose = () => {
        log.info("Host WebSocket closed");
      };
      this.hostWs.onerror = (err) => {
        log.error("Host WebSocket error", err);
      };
    } catch (e) {
      log.error("Failed to connect Host WS", e);
    }
  }

  private scheduleReconnect(): void {
    if (this.isDisposed || this.reconnectTimer) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isDisposed) {
        this.initMuxWs();
        this.initHostWs();
      }
    }, 2500);
  }

  public subscribeMux(handler: (frame: MuxFrame) => void): () => void {
    this.muxListeners.add(handler);
    return () => {
      this.muxListeners.delete(handler);
    };
  }

  public subscribeHost(handler: (frame: HostFrame) => void): () => void {
    this.hostListeners.add(handler);
    return () => {
      this.hostListeners.delete(handler);
    };
  }

  public subscribeConnection(handler: (connected: boolean) => void): () => void {
    this.connectionListeners.add(handler);
    handler(this.isConnected);
    return () => {
      this.connectionListeners.delete(handler);
    };
  }

  /**
   * Generic JSON-RPC caller over HTTP POST /api
   */
  public async callRpc<T>(method: string, payload: unknown = {}): Promise<T> {
    const rpcId = `rpc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const requestBody = {
      type: "client-request",
      rpcId,
      method,
      payload,
    };

    const response = await fetch(`${this.baseUrl}/api`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`RPC HTTP error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (data && typeof data === "object" && "result" in data) {
      const result = data.result;
      if (result.ok === true) {
        this.setConnected(true);
        return result.value as T;
      }
      const err = result.error || { message: "Unknown RPC error" };
      throw new Error(err.message || `RPC Error: ${err.code || "unknown"}`);
    }

    this.setConnected(true);
    return data as T;
  }

  /* ---------------- Workspace API ---------------- */

  public async listWorkspaces(): Promise<WorkspaceListResult> {
    return this.callRpc<WorkspaceListResult>("workspace.list", {});
  }

  public async createWorkspace(path: string): Promise<{ workspace: WorkspaceView; created: boolean }> {
    return this.callRpc<{ workspace: WorkspaceView; created: boolean }>("workspace.create", { path });
  }

  public async renameWorkspace(workspaceId: string, title: string): Promise<{ workspace: WorkspaceView }> {
    return this.callRpc<{ workspace: WorkspaceView }>("workspace.rename", { workspaceId, title });
  }

  public async deleteWorkspace(workspaceId: string): Promise<{ deleted: true }> {
    return this.callRpc<{ deleted: true }>("workspace.delete", { workspaceId });
  }

  public async archiveSession(sessionId: string): Promise<{ archivedSessionIds: string[] }> {
    return this.callRpc<{ archivedSessionIds: string[] }>("workspace.archiveSession", { sessionId });
  }

  /* ---------------- Session API ---------------- */

  public async listSessions(): Promise<{ items: SessionSummary[] }> {
    try {
      return await this.callRpc<{ items: SessionSummary[] }>("session.list", {});
    } catch {
      return { items: [] };
    }
  }

  public async createSession(cwd: string, preset?: string): Promise<{ sessionId: string }> {
    return this.callRpc<{ sessionId: string }>("session.create", {
      cwd,
      ...(preset ? { agentPreset: preset } : {}),
    });
  }

  public async renameSession(sessionId: string, title: string): Promise<void> {
    await this.callRpc<void>("session.rename", { sessionId, title });
  }

  public async getSessionHistory(sessionId: string): Promise<any> {
    return this.callRpc<any>("session.history", { sessionId });
  }

  public async getSessionModels(sessionId: string): Promise<{
    current: { provider: string; model: string; reasoningEffort?: string };
    providers: Array<{ id: string; name: string; models: string[] }>;
  }> {
    return this.callRpc<any>("session.models", { sessionId });
  }

  public async selectSessionModel(
    sessionId: string,
    provider: string,
    model: string,
    reasoningEffort?: string,
  ): Promise<void> {
    await this.callRpc<void>("session.selectModel", {
      sessionId,
      provider,
      model,
      ...(reasoningEffort ? { reasoningEffort } : {}),
    });
  }

  public async sendPrompt(sessionId: string, text: string, attachments: any[] = []): Promise<void> {
    await this.callRpc<void>("session.prompt", {
      sessionId,
      text,
      attachments,
    });
  }

  public async cancelSession(sessionId: string): Promise<void> {
    await this.callRpc<void>("session.cancel", { sessionId });
  }

  /* ---------------- Interactive Questions & Approvals ---------------- */

  public async respondToQuestion(
    rpcId: string,
    sessionId: string,
    answers: AskUserQuestionAnswer[],
  ): Promise<void> {
    const payload = {
      type: "client-response",
      rpcId,
      result: {
        ok: true,
        value: {
          sessionId,
          answer: {
            answers,
          },
        },
      },
    };
    await fetch(`${this.baseUrl}/api/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(async () => {
      await this.callRpc<void>("questions.respond", { rpcId, sessionId, answers });
    });
  }

  public async resolveApproval(approvalId: string, outcome: ApprovalOutcome): Promise<void> {
    await this.callRpc<void>("approvals.resolve", {
      approvalId,
      outcome,
    });
  }

  /* ---------------- Presets & LLM ---------------- */

  public async listPresets(): Promise<{ items: Array<{ id: string; name: string; description?: string }> }> {
    try {
      return await this.callRpc<{ items: any[] }>("agentPreset.list", {});
    } catch {
      return {
        items: [
          { id: "standard", name: "标准模式 (Standard)", description: "全功能 Agent 编码模式" },
          { id: "ptc", name: "PTC 模式 (Code Mode)", description: "编写 TypeScript 脚本执行" },
          { id: "minimal", name: "极简模式 (Minimal)", description: "极低消耗，单会话轻量工具" },
          { id: "cordis", name: "创造模式 (Cordis)", description: "插件与扩展沙箱" },
        ],
      };
    }
  }

  public async selectPreset(preset: string): Promise<void> {
    await this.callRpc<void>("agentPreset.select", { preset });
  }
}

// Global client cache by harness URL
let activeClient: DshGatewayClient | null = null;

export function getGatewayClient(baseUrl?: string): DshGatewayClient | null {
  if (baseUrl) {
    if (!activeClient || activeClient.getUrl() !== baseUrl) {
      if (activeClient) activeClient.disconnect();
      activeClient = new DshGatewayClient(baseUrl);
      activeClient.connect();
    }
  }
  return activeClient;
}
