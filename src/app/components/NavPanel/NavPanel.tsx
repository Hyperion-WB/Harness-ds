import {
  Clock,
  FolderOpen,
  Globe,
  MessageSquare,
  RotateCw,
  Settings,
  Sparkles,
  Square,
} from "lucide-react";
import { useLayoutEffect } from "react";
import { useI18n } from "@/infrastructure/i18n";
import { useAppStore } from "@/app/stores/appStore";
import { useSlidingPill } from "@/app/hooks/useSlidingPill";
import type { SceneId } from "@/shared/types";
import "./NavPanel.scss";

const SCENES: {
  id: SceneId;
  icon: typeof Sparkles;
  label: "nav.welcome" | "nav.session" | "nav.settings";
}[] = [
  { id: "welcome", icon: Sparkles, label: "nav.welcome" },
  { id: "session", icon: MessageSquare, label: "nav.session" },
  { id: "settings", icon: Settings, label: "nav.settings" },
];

export function NavPanel({ collapsed = false }: { collapsed?: boolean }) {
  const { t } = useI18n();
  const workspacePath = useAppStore((s) => s.workspacePath);
  const recent = useAppStore((s) => s.recentWorkspaces);
  const harness = useAppStore((s) => s.harness);
  const activeScene = useAppStore((s) => s.activeScene);
  const setScene = useAppStore((s) => s.setScene);
  const openWorkspace = useAppStore((s) => s.openWorkspace);
  const restartHarness = useAppStore((s) => s.restartHarness);
  const stopRuntime = useAppStore((s) => s.stopRuntime);
  const host = useAppStore((s) => s.host);
  const name = workspacePath?.split(/[\\/]/).filter(Boolean).at(-1);
  const others = recent.filter((item) => item.path !== workspacePath).slice(0, 6);
  const { trackRef, pill, measure } = useSlidingPill<HTMLDivElement>(activeScene, "y");

  useLayoutEffect(() => {
    measure();
    const frame = requestAnimationFrame(() => measure());
    const timer = window.setTimeout(measure, 580);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [collapsed, activeScene, measure]);

  return (
    <aside
      className={`dshg-nav-panel ${collapsed ? "is-collapsed" : ""}`}
      data-collapsed={collapsed ? "true" : "false"}
    >
      <div className="dshg-nav-panel__rail">
        <div ref={trackRef} className="dshg-nav-panel__scenes" role="tablist" aria-label={t("nav.aria")}>
          <span
            className={`dshg-pill dshg-pill--y ${pill.ready ? "is-ready" : ""}`}
            aria-hidden="true"
            style={{
              transform: `translate3d(0, ${pill.top}px, 0)`,
              height: `${pill.height}px`,
            }}
          />
          {SCENES.map((scene) => {
            const Icon = scene.icon;
            const selected = activeScene === scene.id;
            return (
              <button
                key={scene.id}
                type="button"
                role="tab"
                aria-label={t(scene.label)}
                aria-selected={selected}
                title={collapsed ? t(scene.label) : undefined}
                data-pill-active={selected ? "true" : "false"}
                className={`dshg-nav-panel__scene ${selected ? "is-active" : ""}`}
                onClick={() => setScene(scene.id)}
              >
                <Icon size={16} strokeWidth={1.75} />
                <span className="dshg-nav-panel__scene-label">{t(scene.label)}</span>
              </button>
            );
          })}
        </div>

        <div className="dshg-nav-panel__details" aria-hidden={collapsed}>
          <section>
            <div className="dshg-nav-panel__label">{t("panel.workspace")}</div>
            <div className="dshg-nav-panel__workspace" title={workspacePath ?? undefined}>
              {name ?? t("panel.noWorkspace")}
            </div>
          </section>
          {others.length > 0 && (
            <section>
              <div className="dshg-nav-panel__label">
                <Clock size={11} />
                {t("welcome.recent")}
              </div>
              <div className="dshg-nav-panel__recents">
                {others.map((item) => (
                  <button
                    key={item.path}
                    type="button"
                    title={item.path}
                    onClick={() => void openWorkspace(item.path)}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </section>
          )}
          <section>
            <div className="dshg-nav-panel__label">{t("panel.runtime")}</div>
            <div className={`dshg-nav-panel__status is-${harness.state}`}>
              {t(
                `panel.${harness.state === "starting" ? "starting" : harness.state === "ready" ? "ready" : harness.state === "error" ? "error" : "idle"}`,
              )}
            </div>
          </section>
        </div>

        <div className="dshg-nav-panel__spacer" />

        <div className="dshg-nav-panel__tools" role="toolbar" aria-label={t("panel.runtime")}>
          <button
            type="button"
            className="dshg-nav-panel__tool"
            title={t("welcome.open")}
            onClick={() => void openWorkspace()}
          >
            <FolderOpen size={16} strokeWidth={1.75} />
            <span>{t("welcome.open")}</span>
          </button>
          <button
            type="button"
            className="dshg-nav-panel__tool"
            title={t("panel.restart")}
            disabled={!workspacePath}
            onClick={() => void restartHarness()}
          >
            <RotateCw size={16} strokeWidth={1.75} />
            <span>{t("panel.restart")}</span>
          </button>
          <button
            type="button"
            className="dshg-nav-panel__tool"
            title={t("panel.stop")}
            disabled={harness.state === "idle"}
            onClick={() => void stopRuntime()}
          >
            <Square size={16} strokeWidth={1.75} />
            <span>{t("panel.stop")}</span>
          </button>
          <button
            type="button"
            className="dshg-nav-panel__tool dshg-nav-panel__tool--extra"
            title={t("panel.openBrowser")}
            disabled={!harness.url}
            onClick={() => harness.url && void host.openExternal(harness.url)}
          >
            <Globe size={16} strokeWidth={1.75} />
            <span>{t("panel.openBrowser")}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
