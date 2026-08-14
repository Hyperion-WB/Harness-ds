import { useEffect, useRef } from "react";
import { User } from "lucide-react";
import { FishLogo } from "@/component-library";
import { ThinkingBlock } from "./ThinkingBlock";
import { ToolCallCard } from "./ToolCallCard";
import { AskQuestionCard } from "./AskQuestionCard";
import { ApprovalCard } from "./ApprovalCard";
import { MarkdownRenderer } from "./MarkdownRenderer";
import type {
  ChatMessage,
  AskUserQuestionItem,
  AskUserQuestionAnswer,
  ApprovalRequest,
  ApprovalOutcome,
} from "@/infrastructure/dshTypes";
import "./ChatMessageList.scss";

interface ChatMessageListProps {
  messages: ChatMessage[];
  pendingQuestions?: AskUserQuestionItem[] | null;
  onAnswerQuestions?: (answers: AskUserQuestionAnswer[]) => void;
  pendingApproval?: ApprovalRequest | null;
  onResolveApproval?: (approvalId: string, outcome: ApprovalOutcome) => void;
  isStreaming?: boolean;
}

export function ChatMessageList({
  messages,
  pendingQuestions,
  onAnswerQuestions,
  pendingApproval,
  onResolveApproval,
  isStreaming = false,
}: ChatMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAutoScrollEnabled = useRef(true);

  // Auto-scroll on new content
  useEffect(() => {
    if (isAutoScrollEnabled.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, pendingQuestions, pendingApproval, isStreaming]);

  function handleScroll() {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isBottom = scrollHeight - scrollTop - clientHeight < 60;
    isAutoScrollEnabled.current = isBottom;
  }

  if (messages.length === 0 && !pendingQuestions && !pendingApproval) {
    return (
      <div className="dshg-chat-empty">
        <div className="dshg-chat-empty__logo-box">
          <FishLogo size={42} />
        </div>
        <h3>开启智能编码会话</h3>
        <p>输入提示词、提出代码修改需求、或使用 <code>/goal</code> 开启自主目标驱动模式。</p>
      </div>
    );
  }

  return (
    <div className="dshg-chat-list" ref={scrollRef} onScroll={handleScroll}>
      <div className="dshg-chat-list__inner">
        {messages.map((msg) => {
          const isUser = msg.role === "user";

          return (
            <div
              key={msg.id}
              className={`dshg-chat-item is-${msg.role} ${msg.isStreaming ? "is-streaming" : ""}`}
            >
              <div className="dshg-chat-item__avatar">
                {isUser ? (
                  <div className="dshg-avatar is-user">
                    <User size={15} />
                  </div>
                ) : (
                  <div className="dshg-avatar is-assistant">
                    <FishLogo size={18} />
                  </div>
                )}
              </div>

              <div className="dshg-chat-item__content-wrap">
                <div className="dshg-chat-item__header">
                  <span className="dshg-chat-item__sender">
                    {isUser ? "你" : "DeepSeek Harness"}
                  </span>
                  <span className="dshg-chat-item__time">
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <div className="dshg-chat-item__bubble">
                  {/* Thinking/Reasoning chain block */}
                  {msg.reasoning && (
                    <ThinkingBlock
                      reasoning={msg.reasoning}
                      isStreaming={msg.isStreaming && !msg.content}
                    />
                  )}

                  {/* Tool Invocations */}
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="dshg-chat-item__tools">
                      {msg.toolCalls.map((tool) => (
                        <ToolCallCard key={tool.callId} tool={tool} />
                      ))}
                    </div>
                  )}

                  {/* Main Message Markdown Body */}
                  {msg.content ? (
                    <MarkdownRenderer content={msg.content} />
                  ) : msg.isStreaming && !msg.reasoning && (!msg.toolCalls || msg.toolCalls.length === 0) ? (
                    <div className="dshg-typing-indicator">
                      <span />
                      <span />
                      <span />
                    </div>
                  ) : null}

                  {msg.error && (
                    <div className="dshg-chat-item__error">
                      <span>{msg.error}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Interactive Pending Question Card */}
        {pendingQuestions && pendingQuestions.length > 0 && onAnswerQuestions && (
          <div className="dshg-chat-item is-interactive">
            <AskQuestionCard
              questions={pendingQuestions}
              onSubmit={onAnswerQuestions}
            />
          </div>
        )}

        {/* Security Approval Request Card */}
        {pendingApproval && onResolveApproval && (
          <div className="dshg-chat-item is-interactive">
            <ApprovalCard
              request={pendingApproval}
              onResolve={onResolveApproval}
            />
          </div>
        )}
      </div>
    </div>
  );
}
