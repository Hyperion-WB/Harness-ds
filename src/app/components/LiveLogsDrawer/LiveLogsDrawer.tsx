import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Filter, ScrollText, Terminal, Trash2, X } from "lucide-react";
import { useI18n } from "@/infrastructure/i18n";
import { Button } from "@/component-library";
import { useAppStore } from "@/app/stores/appStore";
import "./LiveLogsDrawer.scss";

export function LiveLogsDrawer() {
  const { t } = useI18n();
  const isOpen = useAppStore((s) => s.isLogsDrawerOpen);
  const toggleLogsDrawer = useAppStore((s) => s.toggleLogsDrawer);
  const logs = useAppStore((s) => s.logs);
  const clearLogs = useAppStore((s) => s.clearLogs);

  const [filterText, setFilterText] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const filteredLogs = useMemo(() => {
    if (!filterText.trim()) return logs;
    const query = filterText.toLowerCase();
    return logs.filter((line) => line.toLowerCase().includes(query));
  }, [logs, filterText]);

  useEffect(() => {
    if (isOpen && autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [filteredLogs, isOpen, autoScroll]);

  async function handleCopyAll() {
    if (logs.length === 0) return;
    try {
      await navigator.clipboard.writeText(logs.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  if (!isOpen) return null;

  return (
    <aside className="dshg-logs-drawer" role="dialog" aria-label={t("logs.title")}>
      <div className="dshg-logs-drawer__header">
        <div className="dshg-logs-drawer__title">
          <Terminal size={15} />
          <span>{t("logs.title")}</span>
          <span className="dshg-logs-drawer__badge">
            {t("logs.lineCount").replace("{count}", String(filteredLogs.length))}
          </span>
        </div>

        <div className="dshg-logs-drawer__actions">
          <div className="dshg-logs-drawer__filter">
            <Filter size={13} />
            <input
              value={filterText}
              placeholder={t("logs.filterPlaceholder")}
              onChange={(e) => setFilterText(e.target.value)}
            />
            {filterText && (
              <button
                type="button"
                className="dshg-logs-drawer__clear-filter"
                onClick={() => setFilterText("")}
                aria-label="clear filter"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <button
            type="button"
            className={`dshg-logs-drawer__btn ${autoScroll ? "is-active" : ""}`}
            onClick={() => setAutoScroll(!autoScroll)}
            title={t("logs.autoScroll")}
          >
            <ScrollText size={13} />
            <span>{t("logs.autoScroll")}</span>
          </button>

          <Button onClick={() => void handleCopyAll()} disabled={logs.length === 0}>
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span>{copied ? t("logs.copied") : t("logs.copyAll")}</span>
          </Button>

          <button
            type="button"
            className="dshg-logs-drawer__icon-btn"
            onClick={clearLogs}
            disabled={logs.length === 0}
            title={t("logs.clear")}
            aria-label={t("logs.clear")}
          >
            <Trash2 size={14} />
          </button>

          <button
            type="button"
            className="dshg-logs-drawer__icon-btn dshg-logs-drawer__close"
            onClick={toggleLogsDrawer}
            title={t("window.close")}
            aria-label={t("window.close")}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div ref={logContainerRef} className="dshg-logs-drawer__body">
        {filteredLogs.length === 0 ? (
          <div className="dshg-logs-drawer__empty">
            <p>{t("logs.empty")}</p>
          </div>
        ) : (
          <div className="dshg-logs-drawer__content">
            {filteredLogs.map((line, index) => {
              const isError = /error|failed|exception|panic/i.test(line);
              const isWarn = /warn|warning|deprecated/i.test(line);
              const isInfo = /info|ready|listening|started|http/i.test(line);

              let lineClass = "";
              if (isError) lineClass = "is-error";
              else if (isWarn) lineClass = "is-warn";
              else if (isInfo) lineClass = "is-info";

              return (
                <div key={index} className={`dshg-logs-drawer__line ${lineClass}`}>
                  <span className="dshg-logs-drawer__lineno">{index + 1}</span>
                  <span className="dshg-logs-drawer__text">{line}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
