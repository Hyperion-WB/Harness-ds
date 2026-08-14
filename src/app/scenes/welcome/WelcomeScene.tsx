import { useMemo, useState } from "react";
import {
  Clock,
  Code,
  Command,
  Folder,
  FolderOpen,
  Search,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

import { useI18n } from "@/infrastructure/i18n";
import { Button, FishLogo } from "@/component-library";
import { useAppStore } from "@/app/stores/appStore";
import "./WelcomeScene.scss";

const GREETINGS = [
  "welcome.greeting1",
  "welcome.greeting2",
  "welcome.greeting3",
  "welcome.greeting4",
] as const;

export function WelcomeScene() {
  const { t } = useI18n();
  const recent = useAppStore((s) => s.recentWorkspaces);
  const openWorkspace = useAppStore((s) => s.openWorkspace);
  const setScene = useAppStore((s) => s.setScene);
  const needKey = useAppStore((s) => s.errorBanner === "need-key");
  const host = useAppStore((s) => s.host);
  const openInEditor = useAppStore((s) => s.openInEditor);
  const revealInFileManager = useAppStore((s) => s.revealInFileManager);

  const [busy, setBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const greeting = useMemo(
    () => GREETINGS[Math.floor(Math.random() * GREETINGS.length)],
    [],
  );

  const filteredRecent = useMemo(() => {
    if (!searchQuery.trim()) return recent;
    const query = searchQuery.toLowerCase();
    return recent.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.path.toLowerCase().includes(query),
    );
  }, [recent, searchQuery]);

  async function open(path?: string) {
    setBusy(true);
    try {
      await openWorkspace(path);
    } finally {
      setBusy(false);
    }
  }

  async function remove(path: string) {
    const next = recent.filter((entry) => entry.path !== path);
    const settings = await host.saveSettings({ recentWorkspaces: next });
    useAppStore.setState({ recentWorkspaces: settings.recentWorkspaces });
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const filePath = (file as unknown as { path?: string }).path || file.name;
      if (filePath) {
        void open(filePath);
      }
    }
  }

  return (
    <div
      className={`dshg-welcome ${isDraggingOver ? "is-dragging-over" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDraggingOver && (
        <div className="dshg-welcome__drop-overlay">
          <UploadCloud size={48} />
          <h3>{t("welcome.dragDropRelease")}</h3>
        </div>
      )}

      <div className="dshg-welcome__content">
        <header className="dshg-welcome__greeting">
          <div className="dshg-welcome__logo-wrapper">
            <div className="dshg-welcome__logo-glow" />
            <FishLogo size={36} />
          </div>
          <h1>{t("app.title")}</h1>
          <p>{t(greeting)}</p>

          {needKey && (
            <div className="dshg-welcome__need-key">
              <p>{t("welcome.needKey")}</p>
              <Button onClick={() => setScene("settings")}>{t("welcome.needKeyAction")}</Button>
            </div>
          )}

          {/* Quick Start Cards */}
          <div className="dshg-welcome__cards-grid">
            <button
              type="button"
              className="dshg-welcome__action-card is-primary"
              disabled={busy}
              onClick={() => void open()}
            >
              <div className="dshg-welcome__card-icon">
                <FolderOpen size={18} />
              </div>
              <div className="dshg-welcome__card-text">
                <strong>{busy ? t("welcome.opening") : t("welcome.open")}</strong>
                <span>{t("welcome.dragDropHint")}</span>
              </div>
            </button>

            <button
              type="button"
              className="dshg-welcome__action-card"
              onClick={() => {
                window.dispatchEvent(
                  new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
                );
              }}
            >
              <div className="dshg-welcome__card-icon">
                <Command size={18} />
              </div>
              <div className="dshg-welcome__card-text">
                <strong>{t("command.palette.title")}</strong>
                <span>快捷键 ⌘K / Ctrl+K 唤起</span>
              </div>
            </button>
          </div>
        </header>

        <section className="dshg-welcome__switch">
          <div className="dshg-welcome__switch-header">
            <span className="dshg-welcome__section-label">
              <Clock size={12} />
              {t("welcome.recent")}
            </span>

            {recent.length > 0 && (
              <div className="dshg-welcome__search">
                <Search size={12} />
                <input
                  value={searchQuery}
                  placeholder={t("welcome.searchPlaceholder")}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="dshg-welcome__clear-search"
                    onClick={() => setSearchQuery("")}
                    aria-label="clear"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            )}
          </div>

          {recent.length === 0 ? (
            <p className="dshg-welcome__empty">{t("welcome.empty")}</p>
          ) : filteredRecent.length === 0 ? (
            <p className="dshg-welcome__empty">{t("welcome.noMatches")}</p>
          ) : (
            <ul className="dshg-welcome__recent-list">
              {filteredRecent.map((item) => (
                <li key={item.path} className="dshg-welcome__recent-item">
                  <button
                    type="button"
                    className="dshg-welcome__item-main"
                    disabled={busy}
                    onClick={() => void open(item.path)}
                  >
                    <div className="dshg-welcome__item-title">
                      <strong>{item.name}</strong>
                    </div>
                    <span className="dshg-welcome__item-path" title={item.path}>
                      {item.path}
                    </span>
                  </button>

                  <div className="dshg-welcome__item-actions">
                    <button
                      type="button"
                      className="dshg-welcome__action-btn"
                      title={t("welcome.openInVsCode")}
                      onClick={() => void openInEditor(item.path, "code")}
                    >
                      <Code size={13} />
                    </button>

                    <button
                      type="button"
                      className="dshg-welcome__action-btn"
                      title={t("welcome.revealInExplorer")}
                      onClick={() => void revealInFileManager(item.path)}
                    >
                      <Folder size={13} />
                    </button>

                    <button
                      type="button"
                      className="dshg-welcome__action-btn dshg-welcome__remove-btn"
                      aria-label="remove"
                      onClick={() => void remove(item.path)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="dshg-welcome__credit">
          <button
            type="button"
            onClick={() => void host.openExternal("https://github.com/GCWing/BitFun/")}
          >
            {t("welcome.madeBy")}
          </button>
        </p>
      </div>
    </div>
  );
}
