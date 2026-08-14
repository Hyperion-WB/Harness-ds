import { useMemo } from "react";
import { marked } from "marked";
import "./MarkdownRenderer.scss";

// Configure marked
marked.setOptions({
  gfm: true,
  breaks: true,
});

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const html = useMemo(() => {
    if (!content) return "";
    try {
      return marked.parse(content) as string;
    } catch {
      return content;
    }
  }, [content]);

  return (
    <div
      className="dshg-markdown"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
