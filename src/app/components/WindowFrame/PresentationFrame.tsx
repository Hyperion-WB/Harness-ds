import React, { useEffect } from "react";
import {
  Terminal,
  Settings,
  MessageSquare,
  Boxes,
  ScrollText,
  LayoutTemplate,
  Layers,
  Sparkles,
} from "lucide-react";
import { WindowControls } from "@/component-library";
import { useAppStore } from "@/app/stores/appStore";
import { useWindowChrome } from "@/app/hooks/useWindowChrome";
import "./PresentationFrame.scss";

interface PresentationFrameProps {
  children: React.ReactNode;
}

export function PresentationFrame({ children }: PresentationFrameProps) {
  const presentationMode = useAppStore((s) => s.presentationMode);
  const windowMaterial = useAppStore((s) => s.windowMaterial);
  const activeProfile = useAppStore((s) => s.activeProfile);
  const profiles = useAppStore((s) => s.profiles);
  const switchProfile = useAppStore((s) => s.switchProfile);
  const activeScene = useAppStore((s) => s.activeScene);
  const setScene = useAppStore((s) => s.setScene);
  const toggleLogsDrawer = useAppStore((s) => s.toggleLogsDrawer);
  const openInTerminal = useAppStore((s) => s.openInTerminal);
  const workspacePath = useAppStore((s) => s.workspacePath);
  const setPresentationMode = useAppStore((s) => s.setPresentationMode);

  const { host, isMaximized } = useWindowChrome();

  // Sync material and mode class on document root
  useEffect(() => {
    document.documentElement.setAttribute("data-material", windowMaterial);
    document.documentElement.setAttribute("data-presentation", presentationMode);
  }, [windowMaterial, presentationMode]);

  // Mode 1: Hyperion Signature Full Native Glass Mode
  if (presentationMode === "hyperion") {
    return <>{children}</>;
  }

  // Mode 2: Compatibility Mode (36px Top Frame + Pure Viewport)
  if (presentationMode === "compatibility") {
    return (
      <div className="dshg-presentation-compat">
        <header className="dshg-compat-frame" data-tauri-drag-region>
          <div className="dshg-compat-frame__left">
            <span className="dshg-compat-frame__brand">DeepSeek Harness</span>
            <span className="dshg-compat-frame__badge">兼容模式 (36px Frame)</span>
            <div className="dshg-compat-frame__profile-pill">
              <Boxes size={12} />
              <span>{activeProfile}</span>
            </div>
          </div>
          <div className="dshg-compat-frame__right">
            <button
              type="button"
              className="dshg-compat-btn"
              onClick={() => setPresentationMode("hyperion")}
              title="切换回自研原生增强模式"
            >
              <LayoutTemplate size={13} />
              <span>原生模式</span>
            </button>
            <WindowControls
              isMaximized={isMaximized}
              onMinimize={() => void host.minimizeWindow()}
              onMaximize={() => void host.toggleMaximizeWindow()}
              onClose={() => void host.closeWindow()}
            />
          </div>
        </header>
        <div className="dshg-compat-viewport">{children}</div>
      </div>
    );
  }

  // Mode 3: Extended L-Frame Mode (36px Top + 52px Left Rail)
  if (presentationMode === "extended") {
    return (
      <div className="dshg-presentation-extended">
        <header className="dshg-extended-top" data-tauri-drag-region>
          <div className="dshg-extended-top__left">
            <Sparkles size={14} className="dshg-extended-sparkle" />
            <span className="dshg-extended-title">DSH Desktop</span>
            <span className="dshg-extended-badge">扩展倒 L 模式</span>
          </div>
          <div className="dshg-extended-top__right">
            <select
              className="dshg-extended-profile-select"
              value={activeProfile}
              onChange={(e) => void switchProfile(e.target.value)}
              title="切换当前环境 Profile"
            >
              {profiles.map((p) => (
                <option key={p.name} value={p.name}>
                  Profile: {p.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="dshg-extended-btn"
              onClick={() => setPresentationMode("hyperion")}
              title="切换回自研原生增强模式"
            >
              <LayoutTemplate size={13} />
              <span>原生模式</span>
            </button>
            <WindowControls
              isMaximized={isMaximized}
              onMinimize={() => void host.minimizeWindow()}
              onMaximize={() => void host.toggleMaximizeWindow()}
              onClose={() => void host.closeWindow()}
            />
          </div>
        </header>
        <div className="dshg-extended-body">
          <aside className="dshg-extended-rail">
            <button
              type="button"
              className={`dshg-rail-btn ${activeScene === "session" ? "is-active" : ""}`}
              onClick={() => setScene("session")}
              title="Agent 智能工作区"
            >
              <MessageSquare size={17} />
            </button>
            <button
              type="button"
              className={`dshg-rail-btn ${activeScene === "settings" ? "is-active" : ""}`}
              onClick={() => setScene("settings")}
              title="应用与模型设置"
            >
              <Settings size={17} />
            </button>
            <button
              type="button"
              className="dshg-rail-btn"
              onClick={() => void openInTerminal(workspacePath || undefined)}
              title="打开专用环境终端"
            >
              <Terminal size={17} />
            </button>
            <button
              type="button"
              className="dshg-rail-btn"
              onClick={toggleLogsDrawer}
              title="实时日志控制台"
            >
              <ScrollText size={17} />
            </button>
          </aside>
          <main className="dshg-extended-viewport">{children}</main>
        </div>
      </div>
    );
  }

  // Mode 4: Advanced Caption Mode (32px Compact Caption Row)
  return (
    <div className="dshg-presentation-advanced">
      <header className="dshg-advanced-caption" data-tauri-drag-region>
        <div className="dshg-advanced-caption__left">
          <Layers size={13} />
          <span className="dshg-advanced-brand">DeepSeek Harness</span>
          <span className="dshg-advanced-badge">增强极简 (32px)</span>
          <span className="dshg-advanced-profile">Profile: {activeProfile}</span>
        </div>
        <div className="dshg-advanced-caption__right">
          <button
            type="button"
            className="dshg-advanced-btn"
            onClick={() => setPresentationMode("hyperion")}
            title="切换回自研原生增强模式"
          >
            <LayoutTemplate size={12} />
            <span>原生模式</span>
          </button>
          <WindowControls
            isMaximized={isMaximized}
            onMinimize={() => void host.minimizeWindow()}
            onMaximize={() => void host.toggleMaximizeWindow()}
            onClose={() => void host.closeWindow()}
          />
        </div>
      </header>
      <div className="dshg-advanced-viewport">{children}</div>
    </div>
  );
}
