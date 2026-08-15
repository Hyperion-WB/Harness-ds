import {
  Code,
  Command,
  Folder,
  Globe,
  Terminal,
} from "lucide-react";
import { isMacOSDesktopRuntime } from "@/infrastructure/runtime";
import { useI18n } from "@/infrastructure/i18n";
import { WindowControls } from "@/component-library";
import { useAppStore } from "@/app/stores/appStore";
import { useWindowChrome } from "@/app/hooks/useWindowChrome";
import "./ChromeBar.scss";

export function ChromeBar() {
  const { t } = useI18n();
  const workspacePath = useAppStore((s) => s.workspacePath);
  const harness = useAppStore((s) => s.harness);
  const isLogsOpen = useAppStore((s) => s.isLogsDrawerOpen);
  const toggleLogsDrawer = useAppStore((s) => s.toggleLogsDrawer);
  const navCollapsed = useAppStore((s) => s.navCollapsed);
  const openInEditor = useAppStore((s) => s.openInEditor);
  const openInTerminal = useAppStore((s) => s.openInTerminal);
  const revealInFileManager = useAppStore((s) => s.revealInFileManager);
  const openExternal = useAppStore((s) => s.host.openExternal);
  const isMacOS = isMacOSDesktopRuntime();
  const { host, isMaximized, onDrag, onDoubleClick } = useWindowChrome();

  const workspaceName = workspacePath
    ? workspacePath.split(/[\\/]/).filter(Boolean).at(-1)
    : null;

  const root = [
    "dshg-chrome",
    isMacOS ? "dshg-chrome--macos" : "",
    navCollapsed ? "dshg-chrome--nav-collapsed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <header
      className={root}
      role="banner"
      onMouseDown={onDrag}
      onDoubleClick={onDoubleClick}
    >
      <div className="dshg-chrome__left">
        <div className="dshg-chrome__identity">
          {workspaceName ? (
            <div className="dshg-chrome__breadcrumb">
              <span className="dshg-chrome__project-name">{workspaceName}</span>
              <span className="dshg-chrome__path" title={workspacePath ?? undefined}>
                {workspacePath}
              </span>
            </div>
          ) : (
            <span className="dshg-chrome__app-title">DeepSeek Harness</span>
          )}
        </div>
      </div>

      <div className="dshg-chrome__center" data-tauri-drag-region />

      <div className="dshg-chrome__right">
        {workspacePath && (
          <div className="dshg-chrome__quick-actions">
            <button
              type="button"
              className="dshg-chrome__action-btn"
              title={t("toolbar.openVsCode")}
              onClick={() => void openInEditor(workspacePath, "code")}
            >
              <Code size={13.5} />
              <span className="dshg-chrome__action-label">VS Code</span>
            </button>

            <button
              type="button"
              className="dshg-chrome__action-btn"
              title={t("toolbar.revealFolder")}
              onClick={() => void revealInFileManager(workspacePath)}
            >
              <Folder size={13.5} />
            </button>

            <button
              type="button"
              className="dshg-chrome__action-btn"
              title={t("toolbar.openTerminal")}
              onClick={() => void openInTerminal(workspacePath)}
            >
              <Terminal size={13.5} />
            </button>

            {harness.url && (
              <button
                type="button"
                className="dshg-chrome__action-btn"
                title={t("toolbar.openBrowser")}
                onClick={() => void openExternal(harness.url!)}
              >
                <Globe size={13.5} />
              </button>
            )}
          </div>
        )}

        <button
          type="button"
          className="dshg-chrome__action-btn dshg-chrome__cmd-btn"
          title={t("toolbar.commandPalette")}
          onClick={() => {
            window.dispatchEvent(
              new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
            );
          }}
        >
          <Command size={13} />
          <span className="dshg-chrome__kbd">⌘K</span>
        </button>

        <button
          type="button"
          className={`dshg-chrome__action-btn dshg-chrome__logs-btn ${isLogsOpen ? "is-active" : ""}`}
          title={t("toolbar.toggleLogs")}
          onClick={toggleLogsDrawer}
        >
          <Terminal size={13.5} />
          <span>{t("toolbar.toggleLogs")}</span>
        </button>

        {!isMacOS && (
          <WindowControls
            isMaximized={isMaximized}
            onMinimize={() => void host.minimizeWindow()}
            onMaximize={() => void host.toggleMaximizeWindow()}
            onClose={() => void host.closeWindow()}
          />
        )}
      </div>
    </header>
  );
}
