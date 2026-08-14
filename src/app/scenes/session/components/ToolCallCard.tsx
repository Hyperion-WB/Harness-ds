import { useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  FileEdit,
  FileSearch,
  Loader2,
  Terminal,
  Wrench,
  XCircle,
} from "lucide-react";
import type { ToolCallView } from "@/infrastructure/dshTypes";
import "./ToolCallCard.scss";

interface ToolCallCardProps {
  tool: ToolCallView;
}

function getToolIcon(name: string) {
  if (name.includes("bash") || name.includes("pwsh") || name.includes("terminal")) {
    return Terminal;
  }
  if (name.includes("editor") || name.includes("replace") || name.includes("write")) {
    return FileEdit;
  }
  if (name.includes("search") || name.includes("find")) {
    return FileSearch;
  }
  if (name.includes("code") || name.includes("script")) {
    return Code2;
  }
  return Wrench;
}

function formatToolName(name: string): string {
  const clean = name.replace(/^tool[_-]/, "");
  return clean.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ToolCallCard({ tool }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);
  const Icon = getToolIcon(tool.toolName);

  const isRunning = tool.status === "running" || tool.status === "calling";
  const isFailed = tool.status === "failed";
  const isCompleted = tool.status === "completed";

  const rawParams =
    typeof tool.parameters === "string"
      ? tool.parameters
      : JSON.stringify(tool.parameters, null, 2);

  return (
    <div
      className={`dshg-tool-card is-${tool.status} ${expanded ? "is-expanded" : ""}`}
    >
      <div
        className="dshg-tool-card__header"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="dshg-tool-card__left">
          <div className="dshg-tool-card__icon-box">
            <Icon size={14} />
          </div>
          <span className="dshg-tool-card__name">
            {formatToolName(tool.toolName)}
          </span>
          <span className="dshg-tool-card__id">{tool.callId.slice(-6)}</span>
        </div>

        <div className="dshg-tool-card__right">
          <div className="dshg-tool-card__status">
            {isRunning && (
              <>
                <Loader2 size={12} className="is-spinning" />
                <span>执行中</span>
              </>
            )}
            {isCompleted && (
              <>
                <Check size={12} className="is-success" />
                <span>完成</span>
              </>
            )}
            {isFailed && (
              <>
                <XCircle size={12} className="is-error" />
                <span>失败</span>
              </>
            )}
          </div>
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </div>

      {expanded && (
        <div className="dshg-tool-card__body">
          {rawParams && rawParams !== "{}" && (
            <div className="dshg-tool-card__section">
              <span className="dshg-tool-card__label">输入参数:</span>
              <pre className="dshg-tool-card__code">{rawParams}</pre>
            </div>
          )}

          {tool.output && (
            <div className="dshg-tool-card__section">
              <span className="dshg-tool-card__label">输出结果:</span>
              <pre className="dshg-tool-card__code dshg-tool-card__output">
                {tool.output}
              </pre>
            </div>
          )}

          {tool.error && (
            <div className="dshg-tool-card__section">
              <span className="dshg-tool-card__label is-error">错误信息:</span>
              <pre className="dshg-tool-card__code is-error-text">
                {tool.error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
