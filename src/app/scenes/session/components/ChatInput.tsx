import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Bot,
  Compass,
  Sparkles,
  Square,
} from "lucide-react";
import type { AgentPresetItem } from "@/infrastructure/dshTypes";
import "./ChatInput.scss";

interface ChatInputProps {
  onSend: (text: string) => void;
  onCancel?: () => void;
  isStreaming?: boolean;
  disabled?: boolean;
  activePreset?: string;
  onSelectPreset?: (preset: string) => void;
  activeModel?: string;
  onSelectModel?: (model: string) => void;
  availableModels?: Array<{ id: string; name: string }>;
  presets?: AgentPresetItem[];
}

const SLASH_COMMANDS = [
  { cmd: "/goal", desc: "设定高层自主任务目标并运行" },
  { cmd: "/plan", desc: "进入规划模式 (Plan Mode)" },
  { cmd: "/compact", desc: "压缩当前会话上下文并保留摘要" },
  { cmd: "/clear", desc: "清空当前屏幕对话内容" },
];

const PROMPT_TEMPLATES = [
  { label: "⚡ 深度审查", prompt: "请审查当前工作区的核心代码逻辑，指出潜在的设计隐患与性能瓶颈。" },
  { label: "🐞 排查报错", prompt: "请帮我排查当前工程的错误报错，分析根本原因并给出精准修复方案。" },
  { label: "🚀 性能优化", prompt: "请分析当前模块的运行效率，并给出性能优化与重构方案。" },
  { label: "📝 单元测试", prompt: "请为当前组件或核心模块编写完整的单元测试用例，覆盖边界条件。" },
  { label: "📖 生成文档", prompt: "请为当前代码模块生成规范清晰的中文 API 接口与使用文档。" },
  { label: "💬 Git Commit", prompt: "请根据当前修改内容生成符合语义化规范的 Git Commit Message。" },
];

export function ChatInput({
  onSend,
  onCancel,
  isStreaming = false,
  disabled = false,
  activePreset = "standard",
  onSelectPreset,
  activeModel,
  onSelectModel,
  availableModels = [],
  presets = [
    { id: "standard", name: "标准模式" },
    { id: "ptc", name: "PTC 编程模式" },
    { id: "minimal", name: "极简模式" },
    { id: "cordis", name: "创造模式" },
  ],
}: ChatInputProps) {
  const [text, setText] = useState("");
  const [showPresetsMenu, setShowPresetsMenu] = useState(false);
  const [showModelsMenu, setShowModelsMenu] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashIndex, setSlashIndex] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200,
      )}px`;
    }
  }, [text]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (showSlashMenu) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashIndex((prev) => (prev + 1) % SLASH_COMMANDS.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlashIndex((prev) => (prev - 1 + SLASH_COMMANDS.length) % SLASH_COMMANDS.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const selected = SLASH_COMMANDS[slashIndex];
        if (selected) {
          setText(`${selected.cmd} `);
          setShowSlashMenu(false);
        }
        return;
      }
      if (e.key === "Escape") {
        setShowSlashMenu(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setText(val);
    if (val.startsWith("/")) {
      setShowSlashMenu(true);
    } else {
      setShowSlashMenu(false);
    }
  }

  function handleSend() {
    if (!text.trim() || isStreaming || disabled) return;
    onSend(text.trim());
    setText("");
    setShowSlashMenu(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  return (
    <div className="dshg-chat-input-box">
      {/* Quick Prompt Pills Bar */}
      <div className="dshg-chat-quick-pills">
        {PROMPT_TEMPLATES.map((item) => (
          <button
            key={item.label}
            type="button"
            className="dshg-chat-quick-pill"
            onClick={() => {
              setText(item.prompt);
              textareaRef.current?.focus();
            }}
            title={item.prompt}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Slash command suggestions popup */}
      {showSlashMenu && (
        <div className="dshg-slash-menu">
          <div className="dshg-slash-menu__header">
            <Compass size={13} />
            <span>快捷命令</span>
          </div>
          {SLASH_COMMANDS.map((item, idx) => (
            <button
              key={item.cmd}
              type="button"
              className={`dshg-slash-menu__item ${idx === slashIndex ? "is-selected" : ""}`}
              onClick={() => {
                setText(`${item.cmd} `);
                setShowSlashMenu(false);
                textareaRef.current?.focus();
              }}
            >
              <span className="dshg-slash-menu__cmd">{item.cmd}</span>
              <span className="dshg-slash-menu__desc">{item.desc}</span>
            </button>
          ))}
        </div>
      )}

      <div className="dshg-chat-input-wrapper">
        <textarea
          ref={textareaRef}
          value={text}
          disabled={disabled}
          placeholder={isStreaming ? "智能体正在思考中..." : "输入消息、需求或 / 快捷命令 (Enter 发送, Shift+Enter 换行)..."}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="dshg-chat-textarea"
          rows={1}
        />

        <div className="dshg-chat-input-footer">
          <div className="dshg-chat-input-selectors">
            {/* Presets Selector */}
            <div className="dshg-input-selector-box">
              <button
                type="button"
                className="dshg-input-tag-btn"
                title="选择智能体预设模式"
                onClick={() => {
                  setShowPresetsMenu(!showPresetsMenu);
                  setShowModelsMenu(false);
                }}
              >
                <Bot size={13} />
                <span>{presets.find((p) => p.id === activePreset)?.name || activePreset}</span>
              </button>

              {showPresetsMenu && onSelectPreset && (
                <div className="dshg-input-dropdown-menu">
                  {presets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className={`dshg-input-dropdown-item ${activePreset === preset.id ? "is-selected" : ""}`}
                      onClick={() => {
                        onSelectPreset(preset.id);
                        setShowPresetsMenu(false);
                      }}
                    >
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Model Selector */}
            {availableModels.length > 0 && onSelectModel && (
              <div className="dshg-input-selector-box">
                <button
                  type="button"
                  className="dshg-input-tag-btn"
                  title="切换当前会话模型"
                  onClick={() => {
                    setShowModelsMenu(!showModelsMenu);
                    setShowPresetsMenu(false);
                  }}
                >
                  <Sparkles size={13} />
                  <span>{activeModel || "默认模型"}</span>
                </button>

                {showModelsMenu && (
                  <div className="dshg-input-dropdown-menu">
                    {availableModels.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className={`dshg-input-dropdown-item ${activeModel === m.id ? "is-selected" : ""}`}
                        onClick={() => {
                          onSelectModel(m.id);
                          setShowModelsMenu(false);
                        }}
                      >
                        <span>{m.name || m.id}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="dshg-chat-input-actions">
            {isStreaming ? (
              <button
                type="button"
                className="dshg-send-btn is-stop"
                title="停止生成"
                onClick={onCancel}
              >
                <Square size={14} fill="currentColor" />
              </button>
            ) : (
              <button
                type="button"
                className={`dshg-send-btn ${text.trim() ? "is-active" : ""}`}
                title="发送消息"
                disabled={!text.trim() || disabled}
                onClick={handleSend}
              >
                <ArrowUp size={16} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
