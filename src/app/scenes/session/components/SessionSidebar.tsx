import { useState } from "react";
import {
  Edit2,
  Folder,
  MessageSquare,
  MessageSquarePlus,
  MoreVertical,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/component-library";
import type { SessionSummary } from "@/infrastructure/dshTypes";
import "./SessionSidebar.scss";

interface SessionSidebarProps {
  sessions: SessionSummary[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onCreateSession: () => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onArchiveSession: (id: string) => void;
  workspacePath: string | null;
  onSwitchWorkspace: () => void;
}

export function SessionSidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onRenameSession,
  onArchiveSession,
  workspacePath,
  onSwitchWorkspace,
}: SessionSidebarProps) {
  const [search, setSearch] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const wsName = workspacePath?.split(/[\\/]/).filter(Boolean).at(-1) || "工作区";

  const filtered = sessions.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase()),
  );

  function startRename(s: SessionSummary) {
    setEditingId(s.sessionId);
    setEditDraft(s.title);
    setMenuOpenId(null);
  }

  function submitRename(id: string) {
    if (editDraft.trim()) {
      onRenameSession(id, editDraft.trim());
    }
    setEditingId(null);
  }

  return (
    <aside className="dshg-session-sidebar">
      {/* Workspace Header */}
      <div className="dshg-session-sidebar__workspace">
        <div className="dshg-session-sidebar__ws-info" onClick={onSwitchWorkspace}>
          <Folder size={15} className="dshg-session-sidebar__ws-icon" />
          <div className="dshg-session-sidebar__ws-text" title={workspacePath || ""}>
            <strong>{wsName}</strong>
            <span>点击切换目录</span>
          </div>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="dshg-session-sidebar__actions">
        <Button
          variant="primary"
          className="dshg-session-sidebar__new-btn"
          onClick={onCreateSession}
        >
          <MessageSquarePlus size={15} />
          <span>新建会话</span>
        </Button>
      </div>

      {/* Search Input */}
      {sessions.length > 2 && (
        <div className="dshg-session-sidebar__search">
          <Search size={13} />
          <input
            type="text"
            placeholder="搜索会话..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="dshg-session-sidebar__search-clear"
              onClick={() => setSearch("")}
            >
              <X size={12} />
            </button>
          )}
        </div>
      )}

      {/* Sessions List */}
      <div className="dshg-session-sidebar__list">
        {filtered.length === 0 ? (
          <div className="dshg-session-sidebar__empty">
            <span>{search ? "未找到匹配会话" : "暂无历史会话"}</span>
          </div>
        ) : (
          filtered.map((s) => {
            const isActive = activeSessionId === s.sessionId;
            const isEditing = editingId === s.sessionId;

            return (
              <div
                key={s.sessionId}
                className={`dshg-session-sidebar__item ${isActive ? "is-active" : ""}`}
                onClick={() => !isEditing && onSelectSession(s.sessionId)}
              >
                <div className="dshg-session-sidebar__item-icon">
                  <MessageSquare size={14} />
                </div>

                <div className="dshg-session-sidebar__item-content">
                  {isEditing ? (
                    <input
                      type="text"
                      className="dshg-session-sidebar__edit-input"
                      value={editDraft}
                      autoFocus
                      onChange={(e) => setEditDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submitRename(s.sessionId);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      onBlur={() => submitRename(s.sessionId)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="dshg-session-sidebar__item-title" title={s.title}>
                      {s.title || "未命名会话"}
                    </span>
                  )}
                </div>

                {!isEditing && (
                  <div className="dshg-session-sidebar__item-menu-wrap">
                    <button
                      type="button"
                      className="dshg-session-sidebar__menu-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(menuOpenId === s.sessionId ? null : s.sessionId);
                      }}
                    >
                      <MoreVertical size={13} />
                    </button>

                    {menuOpenId === s.sessionId && (
                      <div className="dshg-session-sidebar__menu-dropdown">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            startRename(s);
                          }}
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
                            onArchiveSession(s.sessionId);
                          }}
                        >
                          <Trash2 size={12} />
                          <span>删除 / 归档</span>
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
    </aside>
  );
}
