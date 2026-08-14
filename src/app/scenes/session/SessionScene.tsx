import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { useI18n } from "@/infrastructure/i18n";
import { Button } from "@/component-library";
import { useAppStore } from "@/app/stores/appStore";
import { getGatewayClient, parseHistoryEvents, type DshGatewayClient } from "@/infrastructure/dshGatewayClient";
import type {
  ApprovalOutcome,
  ApprovalRequest,
  AskUserQuestionAnswer,
  AskUserQuestionItem,
  ChatMessage,
  MuxFrame,
  SessionSummary,
} from "@/infrastructure/dshTypes";
import { SessionSidebar } from "./components/SessionSidebar";
import { ChatMessageList } from "./components/ChatMessageList";
import { ChatInput } from "./components/ChatInput";
import "./SessionScene.scss";

interface SessionSceneProps {
  active?: boolean;
}

export function SessionScene({ active = true }: SessionSceneProps) {
  const { t } = useI18n();
  const harness = useAppStore((s) => s.harness);
  const logs = useAppStore((s) => s.logs);
  const restartHarness = useAppStore((s) => s.restartHarness);
  const workspacePath = useAppStore((s) => s.workspacePath);
  const openWorkspace = useAppStore((s) => s.openWorkspace);
  const toggleLogsDrawer = useAppStore((s) => s.toggleLogsDrawer);
  const defaultModel = useAppStore((s) => s.defaultModel);
  const activePreset = useAppStore((s) => s.activePreset);
  const setActivePreset = useAppStore((s) => s.setActivePreset);

  const [client, setClient] = useState<DshGatewayClient | null>(null);
  const [connected, setConnected] = useState(false);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const [pendingQuestions, setPendingQuestions] = useState<AskUserQuestionItem[] | null>(null);
  const [pendingQuestionRpcId, setPendingQuestionRpcId] = useState<string | null>(null);
  const [pendingApproval, setPendingApproval] = useState<ApprovalRequest | null>(null);

  const [availableModels] = useState<Array<{ id: string; name: string }>>([]);
  const [sessionModel, setSessionModel] = useState<string>(defaultModel.model);

  // Initialize Gateway Client when Harness is Ready
  useEffect(() => {
    if (harness.state === "ready" && harness.url) {
      const gwClient = getGatewayClient(harness.url);
      if (gwClient) {
        setClient(gwClient);
        setConnected(true);

        const unsubConn = gwClient.subscribeConnection((conn) => {
          setConnected(conn);
        });

        // Load initial session list
        void gwClient.listSessions().then((res) => {
          setSessions(res.items || []);
          if (res.items && res.items.length > 0) {
            setActiveSessionId(res.items[0].sessionId);
          } else if (workspacePath) {
            // Auto create session if none exists
            void gwClient.createSession(workspacePath, activePreset).then((created) => {
              setActiveSessionId(created.sessionId);
              void gwClient.listSessions().then((r) => setSessions(r.items || []));
            });
          }
        });

        return () => {
          unsubConn();
        };
      }
    } else {
      setClient(null);
      setConnected(false);
    }
  }, [harness.state, harness.url, workspacePath]);

  // Load session history when active session changes
  useEffect(() => {
    if (!client || !activeSessionId) return;
    void client.getSessionHistory(activeSessionId).then((res: any) => {
      if (res && Array.isArray(res.events)) {
        const parsed = parseHistoryEvents(res.events);
        if (parsed.length > 0) {
          setMessages(parsed);
        }
      }
    }).catch((e) => {
      console.error("Failed to load session history", e);
    });
  }, [client, activeSessionId]);

  // Subscribe to Mux streaming frames
  useEffect(() => {
    if (!client) return;

    const unsubMux = client.subscribeMux((frame: MuxFrame) => {
      if (frame.type === "session/event") {
        const { event, view } = frame;

        // Handle streaming assistant token delta or reasoning
        if (event.type === "text-delta" || event.type === "content-delta" || event.type === "chunk") {
          const delta = (event.delta as string) || (event.text as string) || "";
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.role === "assistant" && last.isStreaming) {
              return [
                ...prev.slice(0, -1),
                { ...last, content: (last.content || "") + delta },
              ];
            } else {
              return [
                ...prev,
                {
                  id: `msg-${Date.now()}`,
                  role: "assistant",
                  content: delta,
                  createdAt: Date.now(),
                  isStreaming: true,
                },
              ];
            }
          });
        } else if (event.type === "reasoning-delta" || event.type === "thinking-delta") {
          const delta = (event.delta as string) || (event.text as string) || "";
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.role === "assistant" && last.isStreaming) {
              return [
                ...prev.slice(0, -1),
                { ...last, reasoning: (last.reasoning || "") + delta },
              ];
            } else {
              return [
                ...prev,
                {
                  id: `msg-${Date.now()}`,
                  role: "assistant",
                  content: "",
                  reasoning: delta,
                  createdAt: Date.now(),
                  isStreaming: true,
                },
              ];
            }
          });
        } else if (event.type === "tool-call" || event.type === "tool-start" || view) {
          if (view) {
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.role === "assistant") {
                const tools = last.toolCalls || [];
                const idx = tools.findIndex((t) => t.callId === view.callId);
                const nextTools = idx >= 0
                  ? tools.map((t, i) => (i === idx ? view : t))
                  : [...tools, view];
                return [...prev.slice(0, -1), { ...last, toolCalls: nextTools }];
              }
              return prev;
            });
          }
        } else if (event.type === "message-end" || event.type === "turn-end" || event.type === "done") {
          setIsStreaming(false);
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.isStreaming) {
              return [...prev.slice(0, -1), { ...last, isStreaming: false }];
            }
            return prev;
          });
        }
      } else if (frame.type === "question/requested") {
        setPendingQuestions(frame.questions);
      } else if (frame.type === "question/resolved") {
        setPendingQuestions(null);
        setPendingQuestionRpcId(null);
      } else if (frame.type === "approval/requested") {
        setPendingApproval({
          approvalId: frame.approvalId,
          sessionId: frame.sessionId,
          toolName: frame.toolName,
          callId: frame.callId,
          reason: frame.reason,
        });
      } else if (frame.type === "approval/resolved") {
        setPendingApproval(null);
      }
    });

    const unsubHost = client.subscribeHost((frame) => {
      if (frame.type === "host/session-added" || frame.type === "host/session-removed") {
        void client.listSessions().then((res) => setSessions(res.items || []));
      }
      if (frame.type === "host/session-status" && frame.sessionId === activeSessionId) {
        setIsStreaming(frame.running);
      }
    });

    return () => {
      unsubMux();
      unsubHost();
    };
  }, [client, activeSessionId]);

  // Handle creating a new session
  async function handleCreateSession() {
    if (!client || !workspacePath) return;
    try {
      const created = await client.createSession(workspacePath, activePreset);
      setActiveSessionId(created.sessionId);
      setMessages([]);
      const updated = await client.listSessions();
      setSessions(updated.items || []);
    } catch (e) {
      console.error("Create session failed", e);
    }
  }

  // Handle renaming a session
  async function handleRenameSession(id: string, newTitle: string) {
    if (!client) return;
    try {
      await client.renameSession(id, newTitle);
      const updated = await client.listSessions();
      setSessions(updated.items || []);
    } catch (e) {
      console.error("Rename session failed", e);
    }
  }

  // Handle archiving a session
  async function handleArchiveSession(id: string) {
    if (!client) return;
    try {
      await client.archiveSession(id);
      const updated = await client.listSessions();
      setSessions(updated.items || []);
      if (activeSessionId === id) {
        setActiveSessionId(updated.items[0]?.sessionId || null);
        setMessages([]);
      }
    } catch (e) {
      console.error("Archive session failed", e);
    }
  }

  // Send prompt from input
  async function handleSendPrompt(text: string) {
    if (!client || !activeSessionId) return;

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

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

    try {
      await client.sendPrompt(activeSessionId, text);
    } catch (e) {
      console.error("Send prompt failed", e);
      setIsStreaming(false);
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          ...assistantMsg,
          isStreaming: false,
          error: String(e),
        },
      ]);
    }
  }

  // Cancel generation
  async function handleCancel() {
    if (!client || !activeSessionId) return;
    try {
      await client.cancelSession(activeSessionId);
      setIsStreaming(false);
    } catch (e) {
      console.error("Cancel generation failed", e);
    }
  }

  // Answer user question
  async function handleAnswerQuestions(answers: AskUserQuestionAnswer[]) {
    if (!client || !activeSessionId) return;
    try {
      await client.respondToQuestion(
        pendingQuestionRpcId || `resp-${Date.now()}`,
        activeSessionId,
        answers,
      );
      setPendingQuestions(null);
      setPendingQuestionRpcId(null);
    } catch (e) {
      console.error("Answer question failed", e);
    }
  }

  // Resolve security approval
  async function handleResolveApproval(approvalId: string, outcome: ApprovalOutcome) {
    if (!client) return;
    try {
      await client.resolveApproval(approvalId, outcome);
      setPendingApproval(null);
    } catch (e) {
      console.error("Resolve approval failed", e);
    }
  }

  if (!workspacePath && harness.state === "idle") {
    return (
      <div className="dshg-session dshg-session--empty">
        <div className="dshg-session__empty-card">
          <Search size={32} />
          <p>{t("session.empty")}</p>
          <Button variant="primary" onClick={() => void openWorkspace()}>
            选择工作区开启会话
          </Button>
        </div>
      </div>
    );
  }

  if (harness.state === "starting" || harness.state === "error") {
    return (
      <div className="dshg-session dshg-session--loading">
        <div className="dshg-session__loading-card">
          {harness.state === "starting" ? (
            <>
              <Loader2 size={36} className="is-spinning" />
              <h3>正在启动 DeepSeek Harness 引擎...</h3>
              <p>初始化 Agent 环境与模型适配层，请稍候</p>
            </>
          ) : (
            <>
              <div className="dshg-session__error-icon">!</div>
              <h3>服务启动异常</h3>
              <p>{harness.error || "未能正常启动 DeepSeek Harness 核心服务"}</p>
              {logs.length > 0 && (
                <pre className="dshg-session__error-logs">
                  {logs.slice(-12).join("\n")}
                </pre>
              )}
              <div className="dshg-session__error-actions">
                <Button variant="primary" onClick={() => void restartHarness()}>
                  重试启动
                </Button>
                <Button onClick={toggleLogsDrawer}>查看完整日志</Button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`dshg-session ${active ? "is-active" : "is-hidden"}`}>
      {/* Main Native Session Layout: Seamlessly blends into the client window */}
      <div className="dshg-session__native-body">
        <SessionSidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={(id) => {
            setActiveSessionId(id);
            setMessages([]);
          }}
          onCreateSession={handleCreateSession}
          onRenameSession={handleRenameSession}
          onArchiveSession={handleArchiveSession}
          workspacePath={workspacePath}
          onSwitchWorkspace={() => void openWorkspace()}
        />

        <main className="dshg-session__chat-area">
          <ChatMessageList
            messages={messages}
            pendingQuestions={pendingQuestions}
            onAnswerQuestions={handleAnswerQuestions}
            pendingApproval={pendingApproval}
            onResolveApproval={handleResolveApproval}
            isStreaming={isStreaming}
          />

          <ChatInput
            onSend={handleSendPrompt}
            onCancel={handleCancel}
            isStreaming={isStreaming}
            disabled={!connected}
            activePreset={activePreset}
            onSelectPreset={(p) => void setActivePreset(p)}
            activeModel={sessionModel}
            onSelectModel={(m) => setSessionModel(m)}
            availableModels={availableModels}
          />
        </main>
      </div>
    </div>
  );
}
