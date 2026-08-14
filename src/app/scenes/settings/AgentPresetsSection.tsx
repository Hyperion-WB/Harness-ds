import { useState } from "react";
import {
  Check,
  Copy,
  FolderOpen,
  Plus,
  Rocket,
} from "lucide-react";
import { Button } from "@/component-library";
import { useI18n } from "@/infrastructure/i18n";
import { useAppStore } from "@/app/stores/appStore";
import { BUILTIN_PRESETS, type AgentPreset } from "@/shared/presetCatalog";
import "./AgentPresetsSection.scss";

export function AgentPresetsSection() {
  const { t, locale } = useI18n();
  const activePreset = useAppStore((s) => s.activePreset);
  const setActivePreset = useAppStore((s) => s.setActivePreset);
  const dshHome = useAppStore((s) => s.dshHome);
  const revealInFileManager = useAppStore((s) => s.revealInFileManager);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleSelectPreset(preset: AgentPreset) {
    await setActivePreset(preset.id);
    setFeedback(t("presets.applied").replace("{name}", preset.name));
    setTimeout(() => setFeedback(null), 3000);
  }


  async function handleCopyConfig(preset: AgentPreset) {
    try {
      await navigator.clipboard.writeText(preset.configSnippet);
      setCopiedId(preset.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  }

  function handleOpenConfig() {
    if (dshHome) {
      void revealInFileManager(dshHome);
    }
  }

  return (
    <section className="dshg-presets">
      <div className="dshg-presets__header">
        <div>
          <h2>{t("presets.title")}</h2>
          <p className="dshg-settings__hint">{t("presets.subtitle")}</p>
        </div>
        <div className="dshg-presets__head-actions">
          <Button onClick={handleOpenConfig}>
            <FolderOpen size={14} />
            <span>{t("presets.openConfig")}</span>
          </Button>
        </div>
      </div>

      {feedback && <div className="dshg-presets__feedback">{feedback}</div>}

      <div className="dshg-presets__group-label">{t("presets.builtin")}</div>

      {/* 2x2 Grid of Presets */}
      <div className="dshg-presets__grid">
        {BUILTIN_PRESETS.map((preset, idx) => {
          const isActive = activePreset === preset.id;
          const isCopied = copiedId === preset.id;

          return (
            <div
              key={preset.id}
              className={`dshg-presets__card ${isActive ? "is-active" : ""}`}
              style={{ animationDelay: `${idx * 45}ms` }}
            >

              <div className="dshg-presets__card-head">
                <div className="dshg-presets__card-title-group">
                  <h3 className="dshg-presets__card-title">{preset.name}</h3>
                  <span className="dshg-presets__builtin-badge">
                    {t("presets.builtin")}
                  </span>
                </div>
                {isActive && (
                  <span className="dshg-presets__active-badge">
                    <Check size={12} />
                    {t("presets.activeBadge")}
                  </span>
                )}
              </div>

              <p className="dshg-presets__card-desc">
                {preset.description[locale as "zh" | "en"] ?? preset.description.zh}
              </p>

              <div className="dshg-presets__card-footer">
                <span className="dshg-presets__codename">{preset.codeName}</span>

                <div className="dshg-presets__card-actions">
                  <button
                    type="button"
                    className="dshg-presets__icon-btn"
                    title={t("presets.copyConfig")}
                    onClick={() => void handleCopyConfig(preset)}
                  >
                    {isCopied ? <Check size={14} /> : <Copy size={14} />}
                  </button>

                  {!isActive && (
                    <button
                      type="button"
                      className="dshg-presets__activate-btn"
                      onClick={() => void handleSelectPreset(preset)}
                    >
                      <Rocket size={13} />
                      <span>{t("presets.useThis")}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom Presets Section */}
      <div className="dshg-presets__custom-section">
        <div className="dshg-presets__group-label">{t("presets.custom")}</div>
        <button
          type="button"
          className="dshg-presets__create-btn"
          onClick={() => {
            const cordis = BUILTIN_PRESETS.find((p) => p.id === "cordis");
            if (cordis) void handleSelectPreset(cordis);
          }}
        >
          <Plus size={16} />
          <span>{t("presets.createCustom")}</span>
        </button>
      </div>
    </section>
  );
}
