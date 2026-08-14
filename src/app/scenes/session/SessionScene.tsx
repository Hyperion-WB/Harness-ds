import { useEffect, useState } from "react";
import {
  Code,
  Folder,
  Globe,
  RotateCw,
  Search,
  Terminal,
} from "lucide-react";
import { useI18n } from "@/infrastructure/i18n";
import { Button } from "@/component-library";
import { useAppStore } from "@/app/stores/appStore";
import "./SessionScene.scss";

interface SessionSceneProps {
  active?: boolean;
}

const ZOOM_LEVELS = [80, 90, 100, 110, 125];

export function SessionScene({ active = true }: SessionSceneProps) {
  const { t } = useI18n();
  const harness = useAppStore((s) => s.harness);
  const logs = useAppStore((s) => s.logs);
  const restartHarness = useAppStore((s) => s.restartHarness);
  const workspacePath = useAppStore((s) => s.workspacePath);
  const openExternal = useAppStore((s) => s.host.openExternal);
  const openInEditor = useAppStore((s) => s.openInEditor);
  const openInTerminal = useAppStore((s) => s.openInTerminal);
  const revealInFileManager = useAppStore((s) => s.revealInFileManager);
  const toggleLogsDrawer = useAppStore((s) => s.toggleLogsDrawer);
  const sessionZoom = useAppStore((s) => s.sessionZoom);
  const setSessionZoom = useAppStore((s) => s.setSessionZoom);
  const sessionReloadKey = useAppStore((s) => s.sessionReloadKey);
  const reloadSession = useAppStore((s) => s.reloadSession);

  const [frameReady, setFrameReady] = useState(false);
  const [frameError, setFrameError] = useState(false);
  const [showZoomMenu, setShowZoomMenu] = useState(false);
  const url = harness.state === "ready" ? harness.url : null;

  useEffect(() => {
    setFrameReady(false);
    setFrameError(false);
  }, [url, sessionReloadKey]);

  if (!workspacePath && harness.state === "idle") {
    return (
      <div className="dshg-session dshg-session--empty">
        <div className="dshg-session__empty-card">
          <Search size={32} />
          <p>{t("session.empty")}</p>
        </div>
      </div>
    );
  }

  const zoomFactor = sessionZoom / 100;

  return (
    <div className={`dshg-session ${active ? "is-active" : "is-hidden"}`}>
      {url && (
        <div className="dshg-session__toolbar" role="toolbar" aria-label="Session toolbar">
          <button
            type="button"
            className="dshg-session__tool-btn"
            title={t("toolbar.refresh")}
            onClick={reloadSession}
          >
            <RotateCw size={13.5} />
          </button>

          <div className="dshg-session__zoom-group">
            <button
              type="button"
              className="dshg-session__tool-btn"
              title={t("toolbar.zoom")}
              onClick={() => setShowZoomMenu(!showZoomMenu)}
            >
              <span>{sessionZoom}%</span>
            </button>
            {showZoomMenu && (
              <div className="dshg-session__zoom-menu">
                {ZOOM_LEVELS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    className={`dshg-session__zoom-item ${level === sessionZoom ? "is-selected" : ""}`}
                    onClick={() => {
                      setSessionZoom(level);
                      setShowZoomMenu(false);
                    }}
                  >
                    {level}%
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="dshg-session__toolbar-sep" />

          {workspacePath && (
            <>
              <button
                type="button"
                className="dshg-session__tool-btn"
                title={t("toolbar.openVsCode")}
                onClick={() => void openInEditor(workspacePath, "code")}
              >
                <Code size={13.5} />
                <span>VS Code</span>
              </button>

              <button
                type="button"
                className="dshg-session__tool-btn"
                title={t("toolbar.openTerminal")}
                onClick={() => void openInTerminal(workspacePath)}
              >
                <Terminal size={13.5} />
              </button>

              <button
                type="button"
                className="dshg-session__tool-btn"
                title={t("toolbar.revealFolder")}
                onClick={() => void revealInFileManager(workspacePath)}
              >
                <Folder size={13.5} />
              </button>
            </>
          )}

          <button
            type="button"
            className="dshg-session__tool-btn"
            title={t("toolbar.toggleLogs")}
            onClick={toggleLogsDrawer}
          >
            <Terminal size={13.5} />
          </button>

          <button
            type="button"
            className="dshg-session__tool-btn"
            title={t("toolbar.openBrowser")}
            onClick={() => void openExternal(url)}
          >
            <Globe size={13.5} />
          </button>
        </div>
      )}

      {url && (
        <div className="dshg-session__frame-wrapper">
          <iframe
            key={`${url}-${sessionReloadKey}`}
            className={`dshg-session__frame ${frameReady ? "is-ready" : ""}`}
            title="dsh web"
            src={url}
            loading="eager"
            allow="clipboard-read; clipboard-write"
            style={{
              transform: `scale(${zoomFactor})`,
              transformOrigin: "top left",
              width: `${100 / zoomFactor}%`,
              height: `${100 / zoomFactor}%`,
            }}
            onLoad={() => setFrameReady(true)}
            onError={() => setFrameError(true)}
          />
        </div>
      )}

      {(!url || !frameReady || frameError || harness.state === "starting" || harness.state === "error") && (
        <div className="dshg-session__overlay" aria-live="polite">
          {harness.state === "starting" || (!frameReady && url && !frameError) ? (
            <div className="dshg-session__skeleton">
              <div className="dshg-session__pulse" />
              <p>{url ? t("session.skeleton") : t("session.loading")}</p>
            </div>
          ) : (
            <div className="dshg-session__error-card">
              <p className="dshg-session__error-title">
                {harness.error ?? (frameError ? t("panel.error") : t("session.loading"))}
              </p>
              {logs.length > 0 && <pre>{logs.slice(-14).join("\n")}</pre>}
              <div className="dshg-session__actions">
                {(harness.state === "error" || workspacePath) && (
                  <Button variant="primary" onClick={() => void restartHarness()}>
                    {t("session.retry")}
                  </Button>
                )}
                <Button onClick={toggleLogsDrawer}>{t("toolbar.toggleLogs")}</Button>
                {url && (
                  <Button onClick={() => void openExternal(url)}>{t("session.openBrowser")}</Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
