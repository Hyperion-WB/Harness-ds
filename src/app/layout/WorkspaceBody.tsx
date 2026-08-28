import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ChromeBar } from "../components/ChromeBar/ChromeBar";
import { AppSidebar } from "../components/Sidebar/AppSidebar";
import { SessionScene } from "../scenes/session/SessionScene";
import { LiveLogsDrawer } from "../components/LiveLogsDrawer/LiveLogsDrawer";
import { CommandPalette } from "../components/CommandPalette/CommandPalette";
import { SetupWizardModal } from "../components/SetupWizard/SetupWizardModal";
import { useAppStore } from "../stores/appStore";
import "./WorkspaceBody.scss";

const SettingsScene = lazy(async () => {
  const mod = await import("../scenes/settings/SettingsScene");
  return { default: mod.SettingsScene };
});

const NARROW_NAV_MQ = "(max-width: 760px)";

export function WorkspaceBody() {
  const collapsed = useAppStore((s) => s.navCollapsed);
  const scene = useAppStore((s) => s.activeScene);
  const modelProviders = useAppStore((s) => s.modelProviders);
  const errorBanner = useAppStore((s) => s.errorBanner);
  const [showWizard, setShowWizard] = useState(false);
  const settingsVisited = useRef(false);
  if (scene === "settings") settingsVisited.current = true;

  // Auto trigger wizard on first start when no key/provider configured
  useEffect(() => {
    if (errorBanner === "need-key" || (modelProviders.length === 0 && !localStorage.getItem("dsh_wizard_dismissed"))) {
      setShowWizard(true);
    }
  }, [errorBanner, modelProviders.length]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia(NARROW_NAV_MQ);
    const sync = () => {
      if (media.matches) {
        useAppStore.setState({ navCollapsed: true });
      }
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return (
    <div className={`dshg-workspace ${collapsed ? "is-collapsed" : ""}`}>
      <ChromeBar />
      <div className="dshg-workspace__body">
        <AppSidebar />
        <main className="dshg-workspace__scene">
          <div className="dshg-workspace__viewport">
            <div
              className={`dshg-workspace__pane dshg-workspace__pane--session ${scene === "session" || scene === "welcome" ? "is-visible" : ""}`}
              hidden={scene === "settings"}
              aria-hidden={scene === "settings"}
              data-active={scene !== "settings" ? "true" : "false"}
            >
              <SessionScene active={scene !== "settings"} />
            </div>

            <div
              className={`dshg-workspace__pane ${scene === "settings" ? "is-visible" : ""}`}
              hidden={scene !== "settings"}
              aria-hidden={scene !== "settings"}
            >
              {(settingsVisited.current || scene === "settings") && (
                <Suspense fallback={<div className="dshg-workspace__lazy">…</div>}>
                  <SettingsScene />
                </Suspense>
              )}
            </div>
          </div>
        </main>
      </div>
      <LiveLogsDrawer />
      <CommandPalette />
      <SetupWizardModal
        isOpen={showWizard}
        onClose={() => {
          localStorage.setItem("dsh_wizard_dismissed", "1");
          setShowWizard(false);
        }}
      />
    </div>
  );
}
