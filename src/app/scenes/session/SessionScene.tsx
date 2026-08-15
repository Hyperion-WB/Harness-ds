import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bug,
  ChevronDown,
  Code,
  Download,
  Folder,
  Loader2,
  Search,
  Sparkles,
  Terminal,
  TestTube2,
  Trash2,
} from "lucide-react";
import { Button, FishLogo } from "@/component-library";
import { useAppStore } from "@/app/stores/appStore";
import { getGatewayClient } from "@/infrastructure/dshGatewayClient";
import type { MuxFrame } from "@/infrastructure/dshTypes";
import { ChatMessageList } from "./components/ChatMessageList";
import { ChatInput } from "./components/ChatInput";
import { ConnectionIndicator } from "@/app/components/ConnectionIndicator/ConnectionIndicator";
import "./SessionScene.scss";

interface SessionSceneProps {
  active?: boolean;
}

const HERO_SUGGESTIONS = [
  { icon: Search, title: "深度代码审查", prompt: "请审查当前工作区核心代码的架构设计与潜在性能瓶颈。" },
  { icon: Sparkles, title: "创建新功能模块", prompt: "我想为当前项目添加一个新功能，请先梳理实现思路与模块设计。" },
  { icon: Bug, title: "排查并修复报错", prompt: "检查当前项目的控制台或构建错误，并给出修复补丁。" },
  { icon: TestTube2, title: "编写测试用例", prompt: "为核心逻辑编写完整的单元测试用例，覆盖边界条件。" },
];

export function SessionScene({ active = true }: SessionSceneProps) {
  const harness = useAppStore((s) => s.harness);
  const agent = useAppStore((s) => s.agent);
  const updateAgentNow = useAppStore((s) => s.updateAgentNow);
  const logs = useAppStore((s) => s.logs);
  const restartHarness = useAppStore((s) => s.restartHarness);
  const workspacePath = useAppStore((s) => s.workspacePath);
  const openWorkspace = useAppStore((s) => s.openWorkspace);
  const toggleLogsDrawer = useAppStore((s) => s.toggleLogsDrawer);
  const defaultModel = useAppStore((s) => s.defaultModel);
  const modelProviders = useAppStore((s) => s.modelProviders);
  const activePreset = useAppStore((s) => s.activePreset);
  const setActivePreset = useAppStore((s) => s.setActivePreset);
  const openInEditor = useAppStore((s) => s.openInEditor);
  const openInTerminal = useAppStore((s) => s.openInTerminal);
  const revealInFileManager = useAppStore((s) => s.revealInFileManager);

  const sessions = useAppStore((s) => s.sessions);
  const activeSessionId = useAppStore((s) => s.activeSessionId);
  const messages = useAppStore((s) => s.messages);
  const isStreaming = useAppStore((s) => s.isStreaming);
  const pendingQuestions = useAppStore((s) => s.pendingQuestions);
  const pendingApproval = useAppStore((s) => s.pendingApproval);
  const setMessages = useAppStore((s) => s.setMessages);
  const setIsStreaming = useAppStore((s) => s.setIsStreaming);
  const setPendingQuestions = useAppStore((s) => s.setPendingQuestions);
  const setPendingApproval = useAppStore((s) => s.setPendingApproval);
  const sendPrompt = useAppStore((s) => s.sendPrompt);
  const cancelGeneration = useAppStore((s) => s.cancelGeneration);
  const respondToQuestion = useAppStore((s) => s.respondToQuestion);
  const resolveApproval = useAppStore((s) => s.resolveApproval);
  const archiveSession = useAppStore((s) => s.archiveSession);

  const [connected, setConnected] = useState(false);
  const [sessionModel, setSessionModel] = useState<string>(defaultModel.model);
  const [showTopbarModelMenu, setShowTopbarModelMenu] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const topbarModelRef = useRef<HTMLDivElement>(null);

  const activeSession = sessions.find((s) => s.sessionId === activeSessionId);
  const sessionTitle = activeSession?.title || (messages.length > 0 ? "进行中会话" : "新对话");

  // Aggregate all available models from providers
  const allAvailableModels = useMemo(() => {
    const list: Array<{ id: string; name: string; provider: string; desc?: string; tag?: string }> = [
      {
        id: "deepseek-chat",
        name: "DeepSeek-V3 (Chat)",
        provider: "deepseek-official",
        desc: "通用强大多语言编程与综合对话",
        tag: "默认",
      },
      {
        id: "deepseek-reasoner",
        name: "DeepSeek-R1 (Reasoner)",
        provider: "deepseek-official",
        desc: "深度长链思考与高难度算法架构",
        tag: "深度推理",
      },
    ];

    for (const p of modelProviders) {
      for (const m of p.models || []) {
        if (!list.some((item) => item.id === m)) {
          list.push({
            id: m,
            name: m,
            provider: p.displayName || p.id,
            desc: `提供商: ${p.displayName || p.id}`,
          });
        }
      }
    }
    return list;
  }, [modelProviders]);

  // Close model menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (topbarModelRef.current && !topbarModelRef.current.contains(e.target as Node)) {
        setShowTopbarModelMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Subscribe to Mux streaming frames when harness is ready
  useEffect(() => {
    if (harness.state === "ready" && harness.url) {
      const gwClient = getGatewayClient(harness.url);
      if (gwClient) {
        setConnected(true);

        const unsubConn = gwClient.subscribeConnection((conn) => {
          setConnected(conn);
        });

        const unsubMux = gwClient.subscribeMux((frame: MuxFrame) => {
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
            setPendingQuestions(frame.questions, (frame as any).questionRpcId || (frame as any).rpcId || null);
          } else if (frame.type === "question/resolved") {
            setPendingQuestions(null, null);
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

        const unsubHost = gwClient.subscribeHost((frame) => {
          if (frame.type === "host/session-status" && frame.sessionId === activeSessionId) {
            setIsStreaming(frame.running);
          }
        });

        return () => {
          unsubConn();
          unsubMux();
          unsubHost();
        };
      }
    } else {
      setConnected(false);
    }
  }, [harness.state, harness.url, activeSessionId, setMessages, setIsStreaming, setPendingQuestions, setPendingApproval]);

  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function handleDownloadCore() {
    setIsDownloading(true);
    setDownloadError(null);
    try {
      await updateAgentNow();
      const updatedAgent = useAppStore.getState().agent;
      if (!updatedAgent.installedVersion) {
        const banner = useAppStore.getState().errorBanner;
        setDownloadError(banner || "核心组件安装未返回版本号，请检查网络或 Node.js 环境");
        return;
      }
      const ws = useAppStore.getState().workspacePath;
      if (ws) {
        await restartHarness();
      }
    } catch (e: any) {
      setDownloadError(e?.message || String(e));
    } finally {
      setIsDownloading(false);
    }
  }

  // 1. Initial State: Core Engine Not Downloaded Yet
  if (!agent.installedVersion) {
    return (
      <div className="dshg-session dshg-session--loading">
        <div className="dshg-session__loading-card">
          <div className="dshg-session__loading-spinner">
            <FishLogo size={48} />
          </div>
          <h3>DeepSeek Harness 智能引擎初始化</h3>
          <p>
            首次运行需要下载核心 Agent 引擎组件（<code>@deepseek-ai/dsh</code>）。
            <br />
            核心文件将安全保存在客户端安装目录（<code>data/agent-prefix/</code>），不占用 C 盘空间。
          </p>

          {isDownloading ? (
            <>
              <div className="dshg-session__loading-progress">
                <div className="dshg-session__loading-bar is-animating" />
              </div>
              <div className="dshg-session__loading-steps">
                <div className="dshg-session__loading-step is-active">
                  <span className="dshg-session__step-dot" />
                  <span>正在从国内高速镜像源 (npmmirror) 下载核心包...</span>
                </div>
                <div className="dshg-session__loading-step is-active">
                  <span className="dshg-session__step-dot" />
                  <span>正在解压并写入客户端数据目录...</span>
                </div>
              </div>
              {logs.length > 0 && (
                <div className="dshg-session__micro-logs">
                  <div className="dshg-session__micro-logs-head">
                    <Terminal size={12} />
                    <span>实时下载日志 ({logs.length} 行)</span>
                  </div>
                  <pre className="dshg-session__micro-logs-body">
                    {logs.slice(-5).join("\n")}
                  </pre>
                </div>
              )}
            </>
          ) : downloadError ? (
            <div className="dshg-session__download-error">
              <div className="dshg-session__error-icon">!</div>
              <h4>下载/初始化未完成</h4>
              <p className="dshg-session__error-desc">{downloadError}</p>
              {logs.length > 0 && (
                <pre className="dshg-session__error-logs">
                  {logs.slice(-8).join("\n")}
                </pre>
              )}
              <div className="dshg-session__error-actions">
                <Button variant="primary" onClick={() => void handleDownloadCore()}>
                  重新尝试下载
                </Button>
                <Button onClick={toggleLogsDrawer}>查看完整日志</Button>
              </div>
            </div>
          ) : (
            <div className="dshg-session__download-actions">
              <Button
                variant="primary"
                onClick={() => void handleDownloadCore()}
              >
                <Download size={15} />
                <span>点击下载核心文件 (约需 3-5 秒)</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!workspacePath && harness.state === "idle") {
    return (
      <div className="dshg-session dshg-session--empty">
        <div className="dshg-session__empty-card">
          <FishLogo size={48} />
          <h2>DeepSeek Harness 智能工作区</h2>
          <p>选择一个本地代码目录，即可开启全功能原生 Agent 编码体验。</p>
          <Button variant="primary" onClick={() => void openWorkspace()}>
            选择工作区目录
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
              <div className="dshg-session__loading-spinner">
                <Loader2 size={36} className="is-spinning" />
              </div>
              <h3>正在启动 DeepSeek Harness 智能引擎...</h3>
              <p>采用高速镜像源初始化 Agent 环境与模型网关连接</p>

              {/* Real-time Loading Progress Bar */}
              <div className="dshg-session__loading-progress">
                <div className="dshg-session__loading-bar is-animating" />
              </div>

              <div className="dshg-session__loading-steps">
                <div className="dshg-session__loading-step is-active">
                  <span className="dshg-session__step-dot" />
                  <span>1. 检查本地 Agent 运行时与高速缓存</span>
                </div>
                <div className="dshg-session__loading-step is-active">
                  <span className="dshg-session__step-dot" />
                  <span>2. 启动 DeepSeek Harness 网关服务</span>
                </div>
                <div className="dshg-session__loading-step is-active">
                  <span className="dshg-session__step-dot" />
                  <span>3. 建立 WebSocket 实时双向流管道</span>
                </div>
              </div>

              {logs.length > 0 && (
                <div className="dshg-session__micro-logs">
                  <div className="dshg-session__micro-logs-head">
                    <Terminal size={12} />
                    <span>实时启动日志 ({logs.length} 行)</span>
                  </div>
                  <pre className="dshg-session__micro-logs-body">
                    {logs.slice(-5).join("\n")}
                  </pre>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="dshg-session__error-icon">!</div>
              <h3>引擎启动异常</h3>
              <p>{harness.error || "未能正常启动 DeepSeek Harness 后台服务"}</p>
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

  function handleExportSession() {
    if (messages.length === 0) return;
    const dateStr = new Date().toISOString().slice(0, 10);
    const content = [
      `# ${sessionTitle}`,
      `*导出时间: ${new Date().toLocaleString()}*`,
      `*模型: ${sessionModel} | 预设模式: ${activePreset}*`,
      "",
      "---",
      "",
      ...messages.map((m) => {
        const speaker = m.role === "user" ? "### 👤 用户" : "### 🤖 DeepSeek Harness";
        return `${speaker}\n\n${m.content || ""}\n\n---`;
      }),
    ].join("\n\n");

    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sessionTitle.replace(/[/\\?%*:|"<>]/g, "-")}-${dateStr}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={`dshg-session ${active ? "is-active" : "is-hidden"}`}>
      {/* Top Glass Header */}
      <header className="dshg-session__topbar">
        <div className="dshg-session__title-area">
          <span className="dshg-session__current-title">{sessionTitle}</span>
          <div className="dshg-session__tags">
            {/* Claude-style Model Switcher in Topbar */}
            <div className="dshg-session__model-picker-wrap" ref={topbarModelRef}>
              <button
                type="button"
                className="dshg-session__model-tag is-interactive"
                onClick={() => setShowTopbarModelMenu(!showTopbarModelMenu)}
                title="点击快速切换当前会话模型"
              >
                <Sparkles size={11} className="dshg-session__model-sparkle" />
                <span>{allAvailableModels.find((m) => m.id === sessionModel)?.name || sessionModel}</span>
                <ChevronDown size={10} className={`dshg-session__chevron ${showTopbarModelMenu ? "is-open" : ""}`} />
              </button>

              {showTopbarModelMenu && (
                <div className="dshg-topbar-model-menu">
                  <div className="dshg-topbar-model-menu__head">
                    <span>切换会话模型 (Model Switcher)</span>
                  </div>
                  <div className="dshg-topbar-model-menu__list">
                    {allAvailableModels.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className={`dshg-topbar-model-item ${sessionModel === m.id ? "is-selected" : ""}`}
                        onClick={() => {
                          setSessionModel(m.id);
                          setShowTopbarModelMenu(false);
                        }}
                      >
                        <div className="dshg-topbar-model-item__title">
                          <span className="dshg-topbar-model-item__name">{m.name}</span>
                          {m.tag && <span className="dshg-topbar-model-item__tag">{m.tag}</span>}
                        </div>
                        {m.desc && <span className="dshg-topbar-model-item__desc">{m.desc}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <span className="dshg-session__preset-tag">{activePreset}</span>
            {messages.length > 0 && (
              <span className="dshg-session__stats-tag">{messages.length} 条消息</span>
            )}
            <ConnectionIndicator connected={connected} />
          </div>
        </div>

        <div className="dshg-session__actions">
          {workspacePath && (
            <>
              <button
                type="button"
                className="dshg-session__action-btn"
                title="在 VS Code 中打开工作区"
                onClick={() => void openInEditor(workspacePath, "code")}
              >
                <Code size={14} />
                <span>VS Code</span>
              </button>

              <button
                type="button"
                className="dshg-session__action-btn"
                title="打开终端"
                onClick={() => void openInTerminal(workspacePath)}
              >
                <Terminal size={14} />
              </button>

              <button
                type="button"
                className="dshg-session__action-btn"
                title="在文件管理器中定位"
                onClick={() => void revealInFileManager(workspacePath)}
              >
                <Folder size={14} />
              </button>
            </>
          )}

          {messages.length > 0 && (
            <button
              type="button"
              className="dshg-session__action-btn"
              title="导出对话为 Markdown 文件"
              onClick={handleExportSession}
            >
              <Download size={14} />
              <span>导出</span>
            </button>
          )}

          {activeSessionId && messages.length > 0 && (
            <button
              type="button"
              className="dshg-session__action-btn is-danger"
              title="清除当前会话"
              onClick={() => void archiveSession(activeSessionId)}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </header>

      {/* Main Chat Body */}
      <main className="dshg-session__main">
        {messages.length === 0 ? (
          <div className="dshg-session__hero">
            <div className="dshg-session__hero-logo">
              <FishLogo size={46} />
            </div>
            <h1 className="dshg-session__hero-title">有什么我可以帮您编写的？</h1>
            <p className="dshg-session__hero-subtitle">
              原生融合 DeepSeek 核心 Agent 与代码工具链，直接输入提示词即可开始。
            </p>

            <div className="dshg-session__suggestions">
              {HERO_SUGGESTIONS.map((item, idx) => {
                const IconComp = item.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    className="dshg-session__suggestion-card"
                    onClick={() => void sendPrompt(item.prompt)}
                  >
                    <div className="dshg-session__suggestion-header">
                      <div className="dshg-session__suggestion-icon">
                        <IconComp size={15} />
                      </div>
                      <strong className="dshg-session__suggestion-title">{item.title}</strong>
                    </div>
                    <span className="dshg-session__suggestion-prompt">{item.prompt}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <ChatMessageList
            messages={messages}
            pendingQuestions={pendingQuestions}
            onAnswerQuestions={respondToQuestion}
            pendingApproval={pendingApproval}
            onResolveApproval={resolveApproval}
            isStreaming={isStreaming}
          />
        )}

        {/* Bottom Input Composer */}
        <div className="dshg-session__composer-wrap">
          <ChatInput
            onSend={(text) => void sendPrompt(text)}
            onCancel={() => void cancelGeneration()}
            isStreaming={isStreaming}
            disabled={false}
            connected={connected}
            onReconnect={() => void restartHarness()}
            activePreset={activePreset}
            onSelectPreset={(p) => void setActivePreset(p)}
            activeModel={sessionModel}
            onSelectModel={(m) => setSessionModel(m)}
            availableModels={allAvailableModels}
          />
        </div>
      </main>
    </div>
  );
}
