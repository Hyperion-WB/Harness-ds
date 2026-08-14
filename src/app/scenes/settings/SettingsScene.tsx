import { useEffect, useState } from "react";
import {
  Bot,
  Cpu,
  Layers,
  Palette,
  Puzzle,
  Sparkles,
} from "lucide-react";
import { Button, Switch } from "@/component-library";
import { useI18n } from "@/infrastructure/i18n";
import { useAppStore } from "@/app/stores/appStore";
import { useSlidingPill } from "@/app/hooks/useSlidingPill";
import { ModelsSection } from "./ModelsSection";
import { AgentPresetsSection } from "./AgentPresetsSection";
import { PluginsSection } from "./PluginsSection";
import type { DoctorReport, Theme } from "@/shared/types";
import "./SettingsScene.scss";

const THEMES: Theme[] = ["dark", "light", "system"];

type SettingsTab = "all" | "models" | "presets" | "plugins" | "agent" | "appearance";


export function SettingsScene() {
  const { t } = useI18n();
  const theme = useAppStore((s) => s.theme);
  const closeToTray = useAppStore((s) => s.closeToTray);
  const harnessCommand = useAppStore((s) => s.harnessCommand);
  const agentChannel = useAppStore((s) => s.agentChannel);
  const agentAutoUpdate = useAppStore((s) => s.agentAutoUpdate);
  const autoStart = useAppStore((s) => s.autoStart);
  const globalShortcutEnabled = useAppStore((s) => s.globalShortcutEnabled);
  const agent = useAppStore((s) => s.agent);
  const applySettings = useAppStore((s) => s.applySettings);
  const refreshAgentStatus = useAppStore((s) => s.refreshAgentStatus);
  const updateAgentNow = useAppStore((s) => s.updateAgentNow);
  const host = useAppStore((s) => s.host);
  const setScene = useAppStore((s) => s.setScene);
  const openWorkspace = useAppStore((s) => s.openWorkspace);
  const harness = useAppStore((s) => s.harness);
  const needKey = useAppStore((s) => s.errorBanner === "need-key");
  const dshHome = useAppStore((s) => s.dshHome);

  const [activeTab, setActiveTab] = useState<SettingsTab>("all");
  const [commandDraft, setCommandDraft] = useState(harnessCommand);
  const [channelDraft, setChannelDraft] = useState(agentChannel);
  const [busy, setBusy] = useState(false);
  const [doctor, setDoctor] = useState<DoctorReport | null>(null);


  const { trackRef: themeTrackRef, pill: themePill } = useSlidingPill<HTMLDivElement>(theme);
  const { trackRef: tabTrackRef, pill: tabPill } = useSlidingPill<HTMLDivElement>(activeTab);

  useEffect(() => {
    setCommandDraft(harnessCommand);
  }, [harnessCommand]);

  useEffect(() => {
    setChannelDraft(agentChannel);
  }, [agentChannel]);

  useEffect(() => {
    void host.doctor().then(setDoctor);
    void refreshAgentStatus();
  }, [host, refreshAgentStatus]);

  return (
    <div className="dshg-settings">
      <div className="dshg-settings__stack">
        <header className="dshg-settings__hero">
          <h1>{t("settings.title")}</h1>
          <p className="dshg-settings__hint">{t("settings.shortcutHint")}</p>
          {needKey && <p className="dshg-settings__warn">{t("welcome.needKey")}</p>}
          <div className="dshg-settings__callout">
            <p>{t("settings.sessionHint")}</p>
            <Button
              variant="primary"
              onClick={() => {
                if (harness.state === "ready") setScene("session");
                else void openWorkspace();
              }}
            >
              {t("settings.openSession")}
            </Button>
          </div>

          {/* Apple Category Filter Tabs */}
          <div
            ref={tabTrackRef}
            className="dshg-settings__category-tabs"
            role="tablist"
          >
            <span
              className={`dshg-floating-pill ${tabPill.ready ? "is-ready" : ""}`}
              aria-hidden="true"
              style={{
                transform: `translate3d(${tabPill.left}px, 0, 0)`,
                width: `${tabPill.width}px`,
                height: `${tabPill.height}px`,
              }}
            />
            {[
              { id: "all" as const, label: "全部", icon: Layers },
              { id: "models" as const, label: t("settings.tab.models"), icon: Sparkles },
              { id: "presets" as const, label: t("settings.tab.presets"), icon: Bot },
              { id: "plugins" as const, label: t("settings.tab.plugins"), icon: Puzzle },
              { id: "agent" as const, label: t("settings.tab.agent"), icon: Cpu },
              { id: "appearance" as const, label: t("settings.tab.appearance"), icon: Palette },
            ].map((tab) => {
              const Icon = tab.icon;
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  data-pill-active={selected ? "true" : "false"}
                  className={`dshg-settings__category-tab ${selected ? "is-active" : ""}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon size={13} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </header>

        <div key={activeTab} className="dshg-settings__tab-content">
          {(activeTab === "all" || activeTab === "models") && <ModelsSection />}
          {(activeTab === "all" || activeTab === "presets") && <AgentPresetsSection />}
          {(activeTab === "all" || activeTab === "plugins") && <PluginsSection />}

          {(activeTab === "all" || activeTab === "appearance") && (
            <section>
              <div className="dshg-settings__section-title">
                <h2>{t("settings.theme")}</h2>
              </div>
              <div
                ref={themeTrackRef}
                className="dshg-settings__segment"
                role="radiogroup"
                aria-label={t("settings.theme")}
              >
                <span
                  className={`dshg-pill ${themePill.ready ? "is-ready" : ""}`}
                  aria-hidden="true"
                  style={{
                    transform: `translate3d(${themePill.left}px, 0, 0)`,
                    width: `${themePill.width}px`,
                  }}
                />
                {THEMES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={theme === value}
                    data-pill-active={theme === value ? "true" : "false"}
                    className={theme === value ? "is-active" : undefined}
                    onClick={() => void applySettings({ theme: value })}
                  >
                    {t(`settings.theme.${value}`)}
                  </button>
                ))}
              </div>
            </section>
          )}

          {(activeTab === "all" || activeTab === "agent") && (
            <section>
              <h2>{t("settings.updates")}</h2>
              <dl>
                <dt>{t("settings.agentVersion")}</dt>
                <dd>
                  {agent.installedVersion ?? "—"}
                  {agent.latestVersion ? ` / npm ${agent.latestVersion}` : ""}
                  {agent.updateAvailable
                    ? ` (${t("settings.updateAvailable")})`
                    : agent.installedVersion
                      ? ` (${t("settings.upToDate")})`
                      : ""}
                </dd>
              </dl>
              <label>{t("settings.agentChannel")}</label>
              <p className="dshg-settings__hint">{t("settings.agentChannelHint")}</p>
              <input
                value={channelDraft}
                onChange={(event) => setChannelDraft(event.target.value)}
                placeholder="latest"
              />
              <div className="dshg-settings__row">
                <Button
                  onClick={() => void applySettings({ agentChannel: channelDraft.trim() || "latest" })}
                >
                  {t("settings.save")}
                </Button>
                <Button onClick={() => void refreshAgentStatus()}>{t("settings.refreshAgent")}</Button>
                <Button
                  variant="primary"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true);
                    void updateAgentNow().finally(() => setBusy(false));
                  }}
                >
                  {t("settings.updateAgent")}
                </Button>
              </div>
              <Switch
                checked={agentAutoUpdate}
                label={t("settings.agentAutoUpdate")}
                onCheckedChange={(checked) => void applySettings({ agentAutoUpdate: checked })}
              />
            </section>
          )}

          {(activeTab === "all" || activeTab === "appearance") && (
            <>
              <section>
                <label>{t("settings.command")}</label>
                <input
                  value={commandDraft}
                  placeholder={t("settings.commandPlaceholder")}
                  onChange={(event) => setCommandDraft(event.target.value)}
                />
                <div className="dshg-settings__row">
                  <Button
                    onClick={() =>
                      void applySettings({ harnessCommand: commandDraft.trim() || "" })
                    }
                  >
                    {t("settings.save")}
                  </Button>
                </div>
              </section>

              <section className="dshg-settings__toggles">
                <Switch
                  checked={closeToTray}
                  label={t("settings.closeToTray")}
                  onCheckedChange={(checked) => void applySettings({ closeToTray: checked })}
                />
                <Switch
                  checked={autoStart}
                  label={t("settings.autoStart")}
                  onCheckedChange={(checked) => void applySettings({ autoStart: checked })}
                />
                <Switch
                  checked={globalShortcutEnabled}
                  label={t("settings.globalShortcut")}
                  onCheckedChange={(checked) =>
                    void applySettings({ globalShortcutEnabled: checked })
                  }
                />
              </section>

              <section>
                <div className="dshg-settings__section-title">
                  <h2>{t("settings.doctor")}</h2>
                  <Button onClick={() => void host.doctor().then(setDoctor)}>
                    {t("settings.runDoctor")}
                  </Button>
                </div>
                <dl>
                  <dt>DSH_HOME</dt>
                  <dd>{dshHome || "—"}</dd>
                  <dt>Node.js</dt>
                  <dd>{doctor?.node.found ? `✓ ${doctor.node.version ?? "available"}` : "✗ not found"}</dd>
                  <dt>npm</dt>
                  <dd>{doctor?.npm.found ? `✓ ${doctor.npm.version ?? "available"}` : "✗ not found"}</dd>
                  <dt>{t("settings.keyring")}</dt>
                  <dd>{doctor?.keyring ? "✓ native" : "file fallback"}</dd>
                </dl>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


