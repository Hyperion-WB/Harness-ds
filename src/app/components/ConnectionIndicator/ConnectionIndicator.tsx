import { useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  ChevronDown,
  RotateCw,
  Terminal,
} from "lucide-react";
import { useAppStore } from "@/app/stores/appStore";
import { getGatewayClient } from "@/infrastructure/dshGatewayClient";
import "./ConnectionIndicator.scss";

interface ConnectionIndicatorProps {
  connected?: boolean;
  compact?: boolean;
}

export function ConnectionIndicator({
  connected = false,
  compact = false,
}: ConnectionIndicatorProps) {
  const harness = useAppStore((s) => s.harness);
  const restartHarness = useAppStore((s) => s.restartHarness);
  const toggleLogsDrawer = useAppStore((s) => s.toggleLogsDrawer);
  const workspacePath = useAppStore((s) => s.workspacePath);

  const [showMenu, setShowMenu] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleReconnect() {
    setIsReconnecting(true);
    if (harness.url) {
      const client = getGatewayClient(harness.url);
      if (client) {
        await client.reconnectNow();
      }
    }
    if (harness.state === "error" || !connected) {
      await restartHarness();
    }
    setTimeout(() => setIsReconnecting(false), 800);
  }

  // Derive status presentation
  let statusType: "connected" | "connecting" | "error" | "idle" = "idle";
  let statusText = "就绪";

  if (harness.state === "starting" || (harness.state === "ready" && !connected)) {
    statusType = "connecting";
    statusText = harness.state === "starting" ? "正在启动引擎..." : "正在建立连接...";
  } else if (harness.state === "ready" && connected) {
    statusType = "connected";
    statusText = "已连接";
  } else if (harness.state === "error") {
    statusType = "error";
    statusText = "引擎异常";
  } else if (!workspacePath) {
    statusType = "idle";
    statusText = "未选工作区";
  }

  return (
    <div className={`dshg-conn-indicator ${compact ? "is-compact" : ""}`} ref={menuRef}>
      <button
        type="button"
        className={`dshg-conn-pill dshg-conn-pill--${statusType} ${showMenu ? "is-active" : ""}`}
        onClick={() => setShowMenu(!showMenu)}
        title="点击查看服务与连接状态诊断"
      >
        <span className={`dshg-conn-dot dshg-conn-dot--${statusType}`} />
        {!compact && <span className="dshg-conn-label">{statusText}</span>}
        {statusType === "connected" && harness.url && !compact && (
          <span className="dshg-conn-url">{harness.url.replace(/^https?:\/\//, "")}</span>
        )}
        <ChevronDown size={10} className={`dshg-conn-chevron ${showMenu ? "is-open" : ""}`} />
      </button>

      {showMenu && (
        <div className="dshg-conn-dropdown">
          <div className="dshg-conn-dropdown__header">
            <div className="dshg-conn-dropdown__title">
              <Activity size={13} className="dshg-conn-dropdown__icon" />
              <span>服务连接诊断 (Service Diagnostics)</span>
            </div>
            <span className={`dshg-conn-badge dshg-conn-badge--${statusType}`}>
              {statusText}
            </span>
          </div>

          <div className="dshg-conn-dropdown__details">
            <div className="dshg-conn-row">
              <span className="dshg-conn-key">引擎状态:</span>
              <span className="dshg-conn-val">
                {harness.state === "ready" ? "🟢 Ready (运行中)" : harness.state === "starting" ? "🟡 Starting (启动中)" : harness.state === "error" ? "🔴 Error (异常)" : "⚪ Idle (空闲)"}
              </span>
            </div>

            <div className="dshg-conn-row">
              <span className="dshg-conn-key">WebSocket 管道:</span>
              <span className="dshg-conn-val">
                {connected ? "🟢 已建立双向流" : "🔴 未连接 / 等待中"}
              </span>
            </div>

            <div className="dshg-conn-row">
              <span className="dshg-conn-key">服务监听地址:</span>
              <span className="dshg-conn-val dshg-conn-val--mono">
                {harness.url || "暂未绑定端口"}
              </span>
            </div>

            {harness.pid && (
              <div className="dshg-conn-row">
                <span className="dshg-conn-key">进程 PID:</span>
                <span className="dshg-conn-val dshg-conn-val--mono">{harness.pid}</span>
              </div>
            )}

            {workspacePath && (
              <div className="dshg-conn-row">
                <span className="dshg-conn-key">工作区路径:</span>
                <span className="dshg-conn-val dshg-conn-val--path" title={workspacePath}>
                  {workspacePath}
                </span>
              </div>
            )}

            {harness.error && (
              <div className="dshg-conn-error-box">
                <div className="dshg-conn-error-head">
                  <AlertCircle size={12} />
                  <span>错误信息:</span>
                </div>
                <div className="dshg-conn-error-text">{harness.error}</div>
              </div>
            )}
          </div>

          <div className="dshg-conn-dropdown__actions">
            <button
              type="button"
              className="dshg-conn-action-btn is-primary"
              disabled={isReconnecting}
              onClick={() => void handleReconnect()}
            >
              <RotateCw size={12} className={isReconnecting ? "is-spinning" : ""} />
              <span>{isReconnecting ? "正在重连..." : "重新连接 / 刷新"}</span>
            </button>

            <button
              type="button"
              className="dshg-conn-action-btn"
              onClick={() => {
                setShowMenu(false);
                toggleLogsDrawer();
              }}
            >
              <Terminal size={12} />
              <span>查看控制台日志</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
