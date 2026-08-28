import { useEffect, useMemo, useRef, useState } from "react";
import {
  Clock,
  Edit2,
  Folder,
  FolderOpen,
  MessageSquare,
  MessageSquarePlus,
  MoreVertical,
  PanelLeft,
  RotateCw,
  Search,
  Settings,
  Terminal,
  Trash2,
  X,
  Sparkles,
} from "lucide-react";
import { FishLogo } from "@/component-library";
import { useI18n } from "@/infrastructure/i18n";
import { useAppStore } from "@/app/stores/appStore";
import type { SessionSummary } from "@/infrastructure/dshTypes";
import "./AppSidebar.scss";

export function AppSidebar() {
  const { t } = useI18n();
  const collapsed = useAppStore((s) => s.navCollapsed);
  const toggleNav = useAppStore((s) => s.toggleNav);
  const activeScene = useAppStore((s) => s.activeScene);
  const setScene = useAppStore((s) => s.setScene);
  const activeProfile = useAppStore((s) => s.activeProfile);
  const workspacePath = useAppStore((s) => s.workspacePath);
  const recentWorkspaces = useAppStore((s) => s.recentWorkspaces);
  const openWorkspace = useAppStore((s) => s.openWorkspace);
  const restartHarness = useAppStore((s) => s.restartHarness);
  const harness = useAppStore((s) => s.harness);
  const defaultModel = useAppStore((s) => s.defaultModel);
  const isLogsOpen = useAppStore((s) => s.isLogsDrawerOpen);
  const toggleLogsDrawer = useAppStore((s) => s.toggleLogsDrawer);
  const host = useAppStore((s) => s.host);

  const sessions = useAppStore((s) => s.sessions);
  const activeSessionId = useAppStore((s) => s.activeSessionId);
  const createSession = useAppStore((s) => s.createSession);
  const selectSession = useAppStore((s) => s.selectSession);
  const renameSession = useAppStore((s) => s.renameSession);
  const archiveSession = useAppStore((s) => s.archiveSession);

  const [searchQuery, setSearchQuery] = useState("");
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const wsDropdownRef = useRef<HTMLDivElement>(null);
  const workspaceName = workspacePath
    ? workspacePath.split(/[\\/]/).filter(Boolean).at(-1) || "工作区"
    : "未选择工作区";

  // Global shortcut: Ctrl+N / Cmd+N for New Chat, Ctrl+B / Cmd+B for Toggle Sidebar
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        void handleNewChat();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleNav();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [workspacePath, toggleNav]);

  // Click outside to close workspace dropdown or menu
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wsDropdownRef.current && !wsDropdownRef.current.contains(e.target as Node)) {
        setShowWorkspaceMenu(false);
      }
      if (menuOpenId) {
        setMenuOpenId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpenId]);

  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase();
    return sessions.filter((s) => (s.title || "").toLowerCase().includes(q));
  }, [sessions, searchQuery]);

  async function handleNewChat() {
    if (!workspacePath) {
      await openWorkspace();
      return;
    }
    setScene("session");
    await createSession();
  }

  async function handleRemoveRecent(e: React.MouseEvent, path: string) {
    e.stopPropagation();
    const next = recentWorkspaces.filter((w) => w.path !== path);
    const settings = await host.saveSettings({ recentWorkspaces: next });
    useAppStore.setState({ recentWorkspaces: settings.recentWorkspaces });
  }

  function startRename(s: SessionSummary, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingId(s.sessionId);
    setEditDraft(s.title || "");
    setMenuOpenId(null);
  }

  async function submitRename(id: string) {
    if (editDraft.trim()) {
      await renameSession(id, editDraft.trim());
    }
    setEditingId(null);
  }

  return (
    <aside className={`dshg-sidebar ${collapsed ? "is-collapsed" : ""}`}>
      {/* 1. Header with Brand & Collapse Button */}
      <div className="dshg-sidebar__header">
        <div
          className="dshg-sidebar__brand"
          onClick={() => {
            if (collapsed) toggleNav();
            else setScene("session");
          }}
          title={collapsed ? "点击展开侧边栏 (⌘B)" : "返回会话"}
        >
          <div className="dshg-sidebar__logo">
            <FishLogo size={20} />
          </div>
          <span className="dshg-sidebar__collapsible-text dshg-sidebar__title">
            DeepSeek Harness
          </span>
        </div>

        <button
          type="button"
          className="dshg-sidebar__collapse-btn"
          title={collapsed ? "展开侧边栏 (⌘B)" : "折叠侧边栏 (⌘B)"}
          onClick={toggleNav}
        >
          <PanelLeft size={15} />
        </button>
      </div>

      {/* 2. New Chat Action Button */}
      <div className="dshg-sidebar__new-chat-wrap">
        <button
          type="button"
          className="dshg-sidebar__new-chat-btn"
          onClick={handleNewChat}
          title="新建对话 (⌘N / Ctrl+N)"
        >
          <MessageSquarePlus size={16} className="dshg-sidebar__btn-icon" />
          <span className="dshg-sidebar__new-chat-text">
            新建对话
          </span>
          <kbd className="dshg-sidebar__shortcut">⌘N</kbd>
        </button>
      </div>

      {/* 3. Workspace Selector Pill */}
      <div className="dshg-sidebar__collapsible-block dshg-sidebar__workspace-section" ref={wsDropdownRef}>
        <div
          className={`dshg-sidebar__workspace-pill ${showWorkspaceMenu ? "is-open" : ""}`}
          onClick={() => setShowWorkspaceMenu((prev) => !prev)}
          title={workspacePath || "点击选择工作区目录"}
        >
          <Folder size={14} className="dshg-sidebar__ws-icon" />
          <div className="dshg-sidebar__ws-text">
            <span className="dshg-sidebar__ws-name">{workspaceName}</span>
            {workspacePath && (
              <span className="dshg-sidebar__ws-path">{workspacePath}</span>
            )}
          </div>
        </div>

        {/* Workspace Dropdown */}
        {showWorkspaceMenu && (
          <>
            <div
              className="dshg-sidebar__ws-backdrop"
              onClick={(e) => {
                e.stopPropagation();
                setShowWorkspaceMenu(false);
              }}
            />
            <div className="dshg-sidebar__ws-dropdown">
              <button
                type="button"
                className="dshg-sidebar__ws-dropdown-item is-action"
                onClick={() => {
                  setShowWorkspaceMenu(false);
                  void openWorkspace();
                }}
              >
              <FolderOpen size={14} />
              <span>打开其他文件夹...</span>
            </button>

            {recentWorkspaces.length > 0 && (
              <div className="dshg-sidebar__ws-recent-group">
                <div className="dshg-sidebar__ws-recent-label">
                  <Clock size={11} />
                  <span>历史工作区</span>
                </div>
                {recentWorkspaces.map((item) => (
                  <div
                    key={item.path}
                    className={`dshg-sidebar__ws-recent-item ${item.path === workspacePath ? "is-current" : ""}`}
                    onClick={() => {
                      setShowWorkspaceMenu(false);
                      void openWorkspace(item.path);
                    }}
                    title={item.path}
                  >
                    <span className="dshg-sidebar__ws-recent-name">{item.name}</span>
                    <button
                      type="button"
                      className="dshg-sidebar__ws-recent-del"
                      title="从历史中移除"
                      onClick={(e) => void handleRemoveRecent(e, item.path)}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>

      {/* 4. Search Sessions (Shown when 2+ sessions) */}
      {sessions.length > 1 && (
        <div className="dshg-sidebar__collapsible-block dshg-sidebar__search">
          <Search size={13} className="dshg-sidebar__search-icon" />
          <input
            type="text"
            placeholder="搜索对话记录..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="dshg-sidebar__search-clear"
              onClick={() => setSearchQuery("")}
            >
              <X size={12} />
            </button>
          )}
        </div>
      )}

      {/* 5. Chat History List */}
      <div className="dshg-sidebar__history">
        <div className="dshg-sidebar__collapsible-block dshg-sidebar__history-head">
          <span>最近对话</span>
          <span className="dshg-sidebar__session-count">{filteredSessions.length}</span>
        </div>

        <div className="dshg-sidebar__history-list">
          {filteredSessions.length === 0 ? (
            <div className="dshg-sidebar__collapsible-block dshg-sidebar__empty">
              <span>{searchQuery ? "未找到匹配会话" : "暂无历史会话"}</span>
            </div>
          ) : (
            filteredSessions.map((s) => {
              const isActive = activeSessionId === s.sessionId && activeScene === "session";
              const isEditing = editingId === s.sessionId;

              return (
                <div
                  key={s.sessionId}
                  className={`dshg-sidebar__history-item ${isActive ? "is-active" : ""}`}
                  onClick={() => {
                    if (!isEditing) {
                      setScene("session");
                      void selectSession(s.sessionId);
                    }
                  }}
                  title={s.title || "未命名会话"}
                >
                  <div className="dshg-sidebar__history-icon">
                    <MessageSquare size={14} />
                  </div>

                  <div className="dshg-sidebar__collapsible-text dshg-sidebar__history-content">
                    {isEditing ? (
                      <input
                        type="text"
                        className="dshg-sidebar__edit-input"
                        value={editDraft}
                        autoFocus
                        onChange={(e) => setEditDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void submitRename(s.sessionId);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        onBlur={() => void submitRename(s.sessionId)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="dshg-sidebar__history-title">
                        {s.title || "新对话"}
                      </span>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="dshg-sidebar__collapsible-text dshg-sidebar__history-actions">
                      <button
                        type="button"
                        className="dshg-sidebar__more-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(menuOpenId === s.sessionId ? null : s.sessionId);
                        }}
                      >
                        <MoreVertical size={13} />
                      </button>

                      {menuOpenId === s.sessionId && (
                        <div className="dshg-sidebar__dropdown-menu">
                          <button
                            type="button"
                            onClick={(e) => startRename(s, e)}
                          >
                            <Edit2 size={12} />
                            <span>重命名</span>
                          </button>
                          <button
                            type="button"
                            className="is-danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpenId(null);
                              void archiveSession(s.sessionId);
                            }}
                          >
                            <Trash2 size={12} />
                            <span>删除会话</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 6. Bottom Dock: Model/Preset + Runtime Status + Settings */}
      <div className="dshg-sidebar__dock">
        {/* Model / Profile Info Chip */}
        {defaultModel.model ? (
          <div
            className="dshg-sidebar__collapsible-block dshg-sidebar__model-chip"
            onClick={() => setScene("settings")}
            title="点击前往设置切换模型与 Profile 环境"
          >
            <Sparkles size={13} className="dshg-sidebar__model-icon" />
            <span className="dshg-sidebar__model-name">{defaultModel.model}</span>
            <span className="dshg-sidebar__preset-badge">{activeProfile}</span>
          </div>
        ) : (
          <div
            className="dshg-sidebar__collapsible-block dshg-sidebar__model-chip is-empty"
            onClick={() => setScene("settings")}
            title="尚未配置模型，点击前往接入 API"
          >
            <Sparkles size={13} className="dshg-sidebar__model-icon" />
            <span className="dshg-sidebar__model-name">接入模型 API</span>
            <span className="dshg-sidebar__preset-badge">Profile: {activeProfile}</span>
          </div>
        )}

        {/* Runtime Status Row */}
        <div className="dshg-sidebar__runtime-bar">
          <div
            className={`dshg-sidebar__runtime-badge is-${harness.state}`}
            title={`Harness 运行状态: ${harness.state}`}
          >
            <span className="dshg-sidebar__runtime-dot" />
            <span className="dshg-sidebar__collapsible-text dshg-sidebar__runtime-label">
              {t(
                `panel.${harness.state === "starting" ? "starting" : harness.state === "ready" ? "ready" : harness.state === "error" ? "error" : "idle"}`,
              )}
            </span>
          </div>

          <div className="dshg-sidebar__runtime-controls">
            <button
              type="button"
              className="dshg-sidebar__tool-btn"
              title="重启 Agent 引擎"
              disabled={!workspacePath || harness.state === "starting"}
              onClick={() => void restartHarness()}
            >
              <RotateCw size={13} />
            </button>

            <button
              type="button"
              className={`dshg-sidebar__tool-btn ${isLogsOpen ? "is-active" : ""}`}
              title="实时控制台日志"
              onClick={toggleLogsDrawer}
            >
              <Terminal size={13} />
            </button>
          </div>
        </div>

        {/* Settings Scene Trigger */}
        <button
          type="button"
          className={`dshg-sidebar__settings-btn ${activeScene === "settings" ? "is-active" : ""}`}
          onClick={() => setScene(activeScene === "settings" ? "session" : "settings")}
          title={t("nav.settings")}
        >
          <Settings size={15} className="dshg-sidebar__btn-icon" />
          <span className="dshg-sidebar__settings-text">{t("nav.settings")}</span>
        </button>
      </div>
    </aside>
  );
}
