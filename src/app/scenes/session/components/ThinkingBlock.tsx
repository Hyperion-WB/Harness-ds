import { useState } from "react";
import { BrainCircuit, ChevronDown, ChevronRight } from "lucide-react";
import "./ThinkingBlock.scss";

interface ThinkingBlockProps {
  reasoning: string;
  isStreaming?: boolean;
}

export function ThinkingBlock({ reasoning, isStreaming = false }: ThinkingBlockProps) {
  const [expanded, setExpanded] = useState(true);

  if (!reasoning && !isStreaming) return null;

  return (
    <div className={`dshg-thinking-block ${isStreaming ? "is-streaming" : ""} ${expanded ? "is-expanded" : "is-collapsed"}`}>
      <button
        type="button"
        className="dshg-thinking-block__header"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div className="dshg-thinking-block__title">
          <BrainCircuit size={15} className="dshg-thinking-block__icon" />
          <span>{isStreaming ? "深度思考中..." : "深度思考过程"}</span>
          {isStreaming && <span className="dshg-thinking-block__dot" />}
        </div>
        <div className="dshg-thinking-block__meta">
          <span className="dshg-thinking-block__length">{reasoning.length} 字</span>
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </button>

      {expanded && (
        <div className="dshg-thinking-block__content">
          <div className="dshg-thinking-block__text">{reasoning}</div>
        </div>
      )}
    </div>
  );
}
