import { useEffect, useState } from "react";
import {
  Bot,
  Boxes,
  Cpu,
  HardDrive,
  Layers,
  LayoutTemplate,
  LogIn,
  Palette,
  Plus,
  Puzzle,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button, Switch } from "@/component-library";
import { useI18n } from "@/infrastructure/i18n";
import { useAppStore } from "@/app/stores/appStore";
import { useSlidingPill } from "@/app/hooks/useSlidingPill";
import { ModelsSection } from "./ModelsSection";
import { AgentPresetsSection } from "./AgentPresetsSection";
import { PluginsSection } from "./PluginsSection";
import { StorageSection } from "./StorageSection";
import type { DoctorReport, PresentationMode, Theme, WindowMaterial } from "@/shared/types";
import "./SettingsScene.scss";

const THEMES: Theme[] = ["dark", "light", "system"];

const PRESENTATION_MODES: Array<{ id: PresentationMode; label: string; desc: string }> = [
  { id: "hyperion", label: "自研原生增强", desc: "自研纯粹 Apple 亚克力玻璃外壳 + 侧边栏与模型快选" },
  { id: "compatibility", label: "兼容模式 (36px)", desc: "上方独立 36px 拖拽栏，下方承载官方纯净视口" },
  { id: "extended", label: "扩展倒 L 模式", desc: "顶部 36px 栏 + 左侧 50px 导轨组成倒 L 毛玻璃框" },
  { id: "advanced", label: "增强极简 (32px)", desc: "极致紧凑 32px 无缝内嵌标题栏，最大化编码区域" },
];

const WINDOW_MATERIALS: Array<{ id: WindowMaterial; label: string; desc: string }> = [
  { id: "glass", label: "Apple 纯净毛玻璃", desc: "高质感液态玻璃折射材质" },
  { id: "acrylic", label: "24px 磨砂亚克力", desc: "通透高斯模糊亚克力 (Acrylic)" },
  { id: "mica", label: "Windows 11 Mica", desc: "Win11 原生细腻云母材质" },
  { id: "mica-alt", label: "Mica Alt 深邃云母", desc: "深色分层云母底板" },
  { id: "solid", label: "纯色极简 (无模糊)", desc: "纯色背景，超低 GPU 与内存消耗" },
];

type SettingsTab = "all" | "models" | "presets" | "plugins" | "profiles" | "appearance" | "agent" | "storage";

export function SettingsScene() {
  const { t } = useI18n();
  const theme = useAppStore((s) => s.theme);
  const presentationMode = useAppStore((s) => s.presentationMode);
  const setPresentationMode = useAppStore((s) => s.setPresentationMode);
  const windowMaterial = useAppStore((s) => s.windowMaterial);
  const setWindowMaterial = useAppStore((s) => s.setWindowMaterial);
  const activeProfile = useAppStore((s) => s.activeProfile);
  const profiles = useAppStore((s) => s.profiles);
  const switchProfile = useAppStore((s) => s.switchProfile);
  const createProfile = useAppStore((s) => s.createProfile);
  const deleteProfile = useAppStore((s) => s.deleteProfile);
  const customPort = useAppStore((s) => s.customPort);
  const lanExposed = useAppStore((s) => s.lanExposed);
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
  const repairAgentNow = useAppStore((s) => s.repairAgentNow);
  const host = useAppStore((s) => s.host);
  const setScene = useAppStore((s) => s.setScene);
  const openWorkspace = useAppStore((s) => s.openWorkspace);
  const workspacePath = useAppStore((s) => s.workspacePath);
  const harness = useAppStore((s) => s.harness);
  const needKey = useAppStore((s) => s.errorBanner === "need-key");
  const dshHome = useAppStore((s) => s.dshHome);

  const [activeTab, setActiveTab] = useState<SettingsTab>("all");
  const [commandDraft, setCommandDraft] = useState(harnessCommand);
  const [channelDraft, setChannelDraft] = useState(agentChannel);
  const [portDraft, setPortDraft] = useState(customPort ? String(customPort) : "");
  const [newProfileName, setNewProfileName] = useState("");
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
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
          <div className="dshg-settings__hero-copy">
            <h1>{t("settings.title")}</h1>
            <p className="dshg-settings__hint">{t("settings.shortcutHint")}</p>
          </div>
          {needKey && <p className="dshg-settings__warn">{t("welcome.needKey")}</p>}
          <div className="dshg-settings__callout">
            <p>{t("settings.sessionHint")}</p>
            <Button
              variant="primary"
              onClick={() => {
                if (harness.state === "ready") {
                  setScene("session");
                } else if (workspacePath) {
                  void openWorkspace(workspacePath);
                } else {
                  setScene("welcome");
                }
              }}
            >
              <LogIn size={14} />
              {t("settings.openSession")}
            </Button>
          </div>

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
              }}
            />
            {[
              { id: "all" as const, label: "全部", icon: Layers },
              { id: "models" as const, label: t("settings.tab.models"), icon: Sparkles },
              { id: "presets" as const, label: t("settings.tab.presets"), icon: Bot },
              { id: "plugins" as const, label: t("settings.tab.plugins"), icon: Puzzle },
              { id: "profiles" as const, label: "Profile 环境隔离", icon: Boxes },
              { id: "appearance" as const, label: "窗口模式与材质", icon: Palette },
              { id: "agent" as const, label: t("settings.tab.agent"), icon: Cpu },
              { id: "storage" as const, label: "存储与缓存", icon: HardDrive },
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
          
          {/* Profile Multi-Environment Isolation Tab */}
          {(activeTab === "all" || activeTab === "profiles") && (
            <section>
              <div className="dshg-settings__section-title">
                <h2>Profile 多环境与配置隔离 (Multi-Profile System)</h2>
                <Button
                  variant="primary"
                  onClick={() => setIsCreatingProfile(true)}
                >
                  <Plus size={13} />
                  <span>新建 Profile</span>
                </Button>
              </div>
              <p className="dshg-settings__hint">
                每个 Profile 拥有独立的插件依赖（<code>node_modules</code>）、启动 Patch 配置与专用运行环境。切换 Profile 后 Agent 引擎将平滑载入对应环境。
              </p>

              {isCreatingProfile && (
                <div className="dshg-profile-create-card">
                  <h4>创建新 Profile 环境</h4>
                  <div className="dshg-settings__row">
                    <input
                      value={newProfileName}
                      onChange={(e) => setNewProfileName(e.target.value)}
                      placeholder="例如: work / coding / python"
                      autoFocus
                    />
                    <Button
                      variant="primary"
                      onClick={async () => {
                        if (!newProfileName.trim()) return;
                        await createProfile(newProfileName.trim());
                        setNewProfileName("");
                        setIsCreatingProfile(false);
                      }}
                    >
                      确认创建
                    </Button>
                    <Button onClick={() => setIsCreatingProfile(false)}>取消</Button>
                  </div>
                </div>
              )}

              <div className="dshg-profiles-grid">
                {profiles.map((p) => {
                  const isActive = p.name === activeProfile;
                  const isBuiltin = p.name === "web" || p.name === "desktop" || p.name === "default";
                  return (
                    <div
                      key={p.name}
                      className={`dshg-profile-card ${isActive ? "is-active" : ""}`}
                    >
                      <div className="dshg-profile-card__head">
                        <div className="dshg-profile-card__title">
                          <Boxes size={16} />
                          <span>{p.name}</span>
                        </div>
                        {isActive && <span className="dshg-profile-card__active-badge">当前运行</span>}
                      </div>
                      <p className="dshg-profile-card__path">{p.path}</p>
                      <div className="dshg-profile-card__meta">
                        <span>插件依赖: {p.packageCount} 个</span>
                        <span>Bundle 组: {p.bundleCount} 个</span>
                      </div>
                      <div className="dshg-profile-card__actions">
                        {!isActive ? (
                          <Button
                            variant="primary"
                            onClick={() => void switchProfile(p.name)}
                          >
                            切换至此环境
                          </Button>
                        ) : (
                          <span className="dshg-profile-card__running-text">✓ 活跃环境中</span>
                        )}
                        {!isBuiltin && !isActive && (
                          <button
                            type="button"
                            className="dshg-profile-card__del-btn"
                            onClick={() => void deleteProfile(p.name)}
                            title="删除此 Profile"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Appearance & 4 Presentation Modes & 5 Materials Tab */}
          {(activeTab === "all" || activeTab === "appearance") && (
            <>
              {/* 1. Four Presentation Modes */}
              <section>
                <div className="dshg-settings__section-title">
                  <h2>窗口呈现模式 (Presentation Modes)</h2>
                </div>
                <p className="dshg-settings__hint">
                  您可以根据工作习惯在 4 种窗口呈现形态之间无缝切换：
                </p>
                <div className="dshg-modes-grid">
                  {PRESENTATION_MODES.map((m) => {
                    const selected = presentationMode === m.id;
                    return (
                      <div
                        key={m.id}
                        className={`dshg-mode-card ${selected ? "is-selected" : ""}`}
                        onClick={() => void setPresentationMode(m.id)}
                      >
                        <div className="dshg-mode-card__head">
                          <LayoutTemplate size={16} />
                          <span className="dshg-mode-card__title">{m.label}</span>
                          {selected && <span className="dshg-mode-card__check">✓ 当前模式</span>}
                        </div>
                        <p className="dshg-mode-card__desc">{m.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* 2. Five System Materials */}
              <section>
                <div className="dshg-settings__section-title">
                  <h2>系统材质效果 (Window Materials)</h2>
                </div>
                <div className="dshg-materials-grid">
                  {WINDOW_MATERIALS.map((mat) => {
                    const selected = windowMaterial === mat.id;
                    return (
                      <button
                        key={mat.id}
                        type="button"
                        className={`dshg-material-card ${selected ? "is-selected" : ""}`}
                        onClick={() => void setWindowMaterial(mat.id)}
                      >
                        <span className="dshg-material-card__title">{mat.label}</span>
                        <span className="dshg-material-card__desc">{mat.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* 3. Theme switch */}
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

              {/* 4. Local Port & LAN Exposure */}
              <section>
                <div className="dshg-settings__section-title">
                  <h2>本地端口与网络暴露范围</h2>
                </div>
                <label>固定本地 Web 端口 (默认 0 表示随机空闲端口)</label>
                <div className="dshg-settings__row">
                  <input
                    value={portDraft}
                    placeholder="0 (随机端口)"
                    onChange={(e) => setPortDraft(e.target.value)}
                  />
                  <Button
                    onClick={() => {
                      const p = parseInt(portDraft.trim(), 10);
                      void applySettings({ customPort: isNaN(p) || p <= 0 ? null : p });
                    }}
                  >
                    保存端口
                  </Button>
                </div>

                <div style={{ marginTop: "12px" }}>
                  <Switch
                    checked={lanExposed}
                    label="局域网共享访问 (允许同 Wi-Fi / 局域网内其他设备访问)"
                    onCheckedChange={(checked) => void applySettings({ lanExposed: checked })}
                  />
                  {lanExposed && (
                    <p className="dshg-settings__warn" style={{ marginTop: "6px" }}>
                      ⚠️ 局域网访问不提供密码鉴权，请仅在完全受信任的家庭/办公私有网络中开启。
                    </p>
                  )}
                </div>
              </section>
            </>
          )}

          {(activeTab === "all" || activeTab === "storage") && <StorageSection />}

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
                <Button
                  disabled={busy}
                  onClick={() => {
                    setBusy(true);
                    void repairAgentNow().finally(() => setBusy(false));
                  }}
                >
                  一键重装/修复核心
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


