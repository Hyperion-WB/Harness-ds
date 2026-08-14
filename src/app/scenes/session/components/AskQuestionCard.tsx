import { useState } from "react";
import { HelpCircle, Send } from "lucide-react";
import { Button } from "@/component-library";
import type { AskUserQuestionItem, AskUserQuestionAnswer } from "@/infrastructure/dshTypes";
import "./AskQuestionCard.scss";

interface AskQuestionCardProps {
  questions: AskUserQuestionItem[];
  onSubmit: (answers: AskUserQuestionAnswer[]) => void;
  disabled?: boolean;
}

export function AskQuestionCard({ questions, onSubmit, disabled = false }: AskQuestionCardProps) {
  // Map of questionId -> selected options array
  const [selections, setSelections] = useState<Record<string, string[]>>(() => {
    const init: Record<string, string[]> = {};
    for (const q of questions) {
      init[q.id] = [];
    }
    return init;
  });

  // Map of questionId -> custom input text
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function toggleOption(questionId: string, label: string, multiSelect = false) {
    setSelections((prev) => {
      const current = prev[questionId] ?? [];
      if (multiSelect) {
        const next = current.includes(label)
          ? current.filter((x) => x !== label)
          : [...current, label];
        return { ...prev, [questionId]: next };
      } else {
        return { ...prev, [questionId]: [label] };
      }
    });
  }

  function handleCustomChange(questionId: string, value: string) {
    setCustomInputs((prev) => ({ ...prev, [questionId]: value }));
  }

  function handleSubmit() {
    setSubmitting(true);
    const answers: AskUserQuestionAnswer[] = questions.map((q) => ({
      id: q.id,
      selected: selections[q.id] || [],
      custom: customInputs[q.id]?.trim() || undefined,
    }));
    onSubmit(answers);
  }

  return (
    <div className="dshg-question-card">
      <div className="dshg-question-card__header">
        <HelpCircle size={18} className="dshg-question-card__icon" />
        <span className="dshg-question-card__badge">智能体需要您的输入</span>
      </div>

      <div className="dshg-question-card__items">
        {questions.map((q) => {
          const selected = selections[q.id] ?? [];
          const custom = customInputs[q.id] ?? "";

          return (
            <div key={q.id} className="dshg-question-card__item">
              <h4 className="dshg-question-card__title">{q.question}</h4>
              {q.detail && <p className="dshg-question-card__detail">{q.detail}</p>}

              {q.options && q.options.length > 0 && (
                <div className="dshg-question-card__options">
                  {q.options.map((opt) => {
                    const isSelected = selected.includes(opt.label);
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        className={`dshg-question-card__option ${isSelected ? "is-selected" : ""}`}
                        disabled={disabled || submitting}
                        onClick={() => toggleOption(q.id, opt.label, q.multiSelect)}
                      >
                        <div className="dshg-question-card__opt-indicator">
                          {q.multiSelect ? (
                            <span className={`dshg-checkbox ${isSelected ? "is-checked" : ""}`} />
                          ) : (
                            <span className={`dshg-radio ${isSelected ? "is-checked" : ""}`} />
                          )}
                        </div>
                        <div className="dshg-question-card__opt-text">
                          <span className="dshg-question-card__opt-label">{opt.label}</span>
                          {opt.description && (
                            <span className="dshg-question-card__opt-desc">{opt.description}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="dshg-question-card__custom">
                <input
                  type="text"
                  placeholder="补充说明或自定义回复 (选填)..."
                  value={custom}
                  disabled={disabled || submitting}
                  onChange={(e) => handleCustomChange(q.id, e.target.value)}
                  className="dshg-question-card__custom-input"
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="dshg-question-card__footer">
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={disabled || submitting}
          className="dshg-question-card__submit-btn"
        >
          <Send size={13} />
          <span>{submitting ? "提交中..." : "提交回答"}</span>
        </Button>
      </div>
    </div>
  );
}
