import { useEffect, useState } from "react";
import {
  ArrowUpCircle,
  Bot,
  Check,
  Code,
  Compass,
  Download,
  FolderSync,
  Layers,
  Layout,
  Plus,
  Puzzle,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import { Button, Select } from "@/component-library";
import { useI18n } from "@/infrastructure/i18n";
import { useAppStore } from "@/app/stores/appStore";
import {
  AWESOME_RADAR_REPO,
  type CuratedPlugin,
  type PluginCategory,
} from "@/shared/pluginCatalog";
import {
  checkAllPluginUpdates,
  getCachedCatalog,
  syncRemoteRadarCatalog,
  type PluginUpdateInfo,
} from "@/shared/pluginUpdateService";
import { MCP_TEMPLATES, type McpTemplate } from "@/shared/mcpCatalog";
import type { McpServer, UpsertMcpInput } from "@/shared/types";
import "./PluginsSection.scss";

type FormMode = "closed" | "create" | "edit";



interface KvPair {
  key: string;
  value: string;
}

interface McpForm {
  id: string;
  serverName: string;
  transport: "stdio" | "streamable-http";
  command: string;
  argsText: string;
  cwd: string;
  url: string;
  env: KvPair[];
  headers: KvPair[];
}

function mapToPairs(map: Record<string, string> | undefined): KvPair[] {
  const entries = Object.entries(map ?? {});
  return entries.length > 0
    ? entries.map(([key, value]) => ({ key, value }))
    : [{ key: "", value: "" }];
}

function pairsToMap(pairs: KvPair[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of pairs) {
    const key = pair.key.trim();
    if (!key) continue;
    out[key] = pair.value;
  }
  return out;
}

function emptyMcpForm(): McpForm {
  return {
    id: "",
    serverName: "",
    transport: "stdio",
    command: "npx",
    argsText: "-y @modelcontextprotocol/server-filesystem .",
    cwd: ".",
    url: "",
    env: [{ key: "", value: "" }],
    headers: [{ key: "", value: "" }],
  };
}

function formFromTemplate(tpl: McpTemplate): McpForm {
  return {
    id: tpl.id,
    serverName: tpl.serverName,
    transport: tpl.transport,
    command: tpl.command,
    argsText: tpl.argsText,
    cwd: tpl.cwd,
    url: tpl.url ?? "",
    env: mapToPairs(tpl.env),
    headers: mapToPairs(tpl.headers),
  };
}

function formFromServer(server: McpServer): McpForm {
  return {
    id: server.id,
    serverName: server.serverName,
    transport: server.transport === "streamable-http" ? "streamable-http" : "stdio",
    command: server.command ?? "npx",
    argsText: server.args.join(" "),
    cwd: server.cwd ?? ".",
    url: server.url ?? "",
    env: mapToPairs(server.env),
    headers: mapToPairs(server.headers),
  };
}

function KvEditor({
  label,
  hint,
  pairs,
  onChange,
}: {
  label: string;
  hint: string;
  pairs: KvPair[];
  onChange: (next: KvPair[]) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="dshg-plugins__kv">
      <div className="dshg-plugins__kv-head">
        <label>{label}</label>
        <Button onClick={() => onChange([...pairs, { key: "", value: "" }])}>
          <Plus size={13} />
          {t("plugins.mcpKvAdd")}
        </Button>
      </div>
      <p className="dshg-settings__hint">{hint}</p>
      {pairs.map((pair, index) => (
        <div key={index} className="dshg-plugins__kv-row">
          <input
            value={pair.key}
            placeholder={t("plugins.mcpKvKey")}
            onChange={(event) => {
              const next = [...pairs];
              next[index] = { ...pair, key: event.target.value };
              onChange(next);
            }}
          />
          <input
            value={pair.value}
            placeholder={t("plugins.mcpKvValue")}
            onChange={(event) => {
              const next = [...pairs];
              next[index] = { ...pair, value: event.target.value };
              onChange(next);
            }}
          />
          <button
            type="button"
            className="dshg-plugins__icon-btn"
            aria-label={t("plugins.mcpKvRemove")}
            onClick={() => {
              const next = pairs.filter((_, i) => i !== index);
              onChange(next.length > 0 ? next : [{ key: "", value: "" }]);
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function PluginsSection() {
  const { t, locale } = useI18n();
  const packages = useAppStore((s) => s.pluginPackages);
  const bundles = useAppStore((s) => s.pluginBundles);
  const mcpServers = useAppStore((s) => s.mcpServers);
  const profilePath = useAppStore((s) => s.pluginProfilePath);
  const dshHome = useAppStore((s) => s.dshHome);
  const harness = useAppStore((s) => s.harness);
  const refreshPlugins = useAppStore((s) => s.refreshPlugins);
  const addPlugin = useAppStore((s) => s.addPlugin);
  const removePlugin = useAppStore((s) => s.removePlugin);
  const upsertMcpServer = useAppStore((s) => s.upsertMcpServer);
  const deleteMcpServer = useAppStore((s) => s.deleteMcpServer);
  const setScene = useAppStore((s) => s.setScene);
  const openExternal = useAppStore((s) => s.host.openExternal);

  const [packageDraft, setPackageDraft] = useState("");
  const [installingPkg, setInstallingPkg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [mode, setMode] = useState<FormMode>("closed");
  const [form, setForm] = useState<McpForm>(() => emptyMcpForm());
  const [hubCategory, setHubCategory] = useState<PluginCategory>("all");
  const [hubSearch, setHubSearch] = useState("");

  const [hubPlugins, setHubPlugins] = useState<CuratedPlugin[]>(() => getCachedCatalog().plugins);
  const [lastSyncedAt, setLastSyncedAt] = useState<number>(() => getCachedCatalog().syncedAt);
  const [isSyncingRadar, setIsSyncingRadar] = useState(false);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [isUpdatingAll, setIsUpdatingAll] = useState(false);
  const [pluginUpdates, setPluginUpdates] = useState<Record<string, PluginUpdateInfo>>({});

  useEffect(() => {
    void refreshPlugins();
  }, [refreshPlugins]);

  useEffect(() => {
    if (packages.length > 0) {
      void checkAllPluginUpdates(packages).then((updates) => {
        setPluginUpdates(updates);
      });
    }
  }, [packages]);

  async function handleSyncRadar() {
    setIsSyncingRadar(true);
    setError(null);
    try {
      const res = await syncRemoteRadarCatalog();
      setHubPlugins(res.plugins);
      setLastSyncedAt(res.syncedAt);
      if (res.success) {
        setFeedback(t("plugins.syncedSuccess").replace("{count}", String(res.newCount)));
      } else {
        setFeedback(res.error || "已载入本地精选列表");
      }
      setTimeout(() => setFeedback(null), 3500);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsSyncingRadar(false);
    }
  }

  async function handleCheckUpdates() {
    if (packages.length === 0) {
      setFeedback(t("plugins.empty"));
      setTimeout(() => setFeedback(null), 2500);
      return;
    }
    setIsCheckingUpdates(true);
    setError(null);
    try {
      const updates = await checkAllPluginUpdates(packages);
      setPluginUpdates(updates);
      const updateCount = Object.values(updates).filter((u) => u.hasUpdate).length;
      if (updateCount > 0) {
        setFeedback(t("plugins.updateBanner").replace("{count}", String(updateCount)));
      } else {
        setFeedback(t("plugins.upToDate"));
      }
      setTimeout(() => setFeedback(null), 3500);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsCheckingUpdates(false);
    }
  }

  async function handleUpdateAll() {
    const needUpdates = Object.values(pluginUpdates).filter((u) => u.hasUpdate);
    if (needUpdates.length === 0) return;
    setIsUpdatingAll(true);
    setError(null);
    try {
      for (const u of needUpdates) {
        setInstallingPkg(u.packageName);
        await addPlugin(u.packageName);
      }
      const updates = await checkAllPluginUpdates(packages);
      setPluginUpdates(updates);
      setFeedback("所有插件已成功更新至最新版本！");
      setTimeout(() => setFeedback(null), 3500);
    } catch (err) {
      setError(String(err));
    } finally {
      setInstallingPkg(null);
      setIsUpdatingAll(false);
    }
  }

  async function installPackage(name: string) {
    const pkg = name.trim();
    if (!pkg) return;
    setInstallingPkg(pkg);
    setError(null);
    try {
      await addPlugin(pkg);
      if (pkg === packageDraft) {
        setPackageDraft("");
      }
      const updates = await checkAllPluginUpdates(packages);
      setPluginUpdates(updates);
    } catch (err) {
      setError(String(err));
    } finally {
      setInstallingPkg(null);
    }
  }

  async function saveMcp() {
    setBusy(true);
    setError(null);
    try {
      const args = form.argsText
        .split(/\s+/)
        .map((item) => item.trim())
        .filter(Boolean);
      const input: UpsertMcpInput = {
        id: form.id.trim() || `mcp-${form.serverName.trim()}`,
        serverName: form.serverName.trim(),
        transport: form.transport,
        command: form.transport === "stdio" ? form.command.trim() : null,
        args: form.transport === "stdio" ? args : [],
        cwd: form.transport === "stdio" ? form.cwd.trim() || "." : null,
        url: form.transport === "streamable-http" ? form.url.trim() : null,
        env: form.transport === "stdio" ? pairsToMap(form.env) : {},
        headers: form.transport === "streamable-http" ? pairsToMap(form.headers) : {},
      };
      await upsertMcpServer(input);
      setMode("closed");
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  const filteredHubPlugins = hubPlugins.filter((plugin: CuratedPlugin) => {
    if (hubCategory === "featured") {
      if (!plugin.featured && (!plugin.stars || plugin.stars < 400)) return false;
    } else if (hubCategory === "official") {
      if (!plugin.isOfficial && plugin.compatibility !== "official") return false;
    } else if (hubCategory !== "all") {
      if (plugin.category !== hubCategory) return false;
    }

    if (hubSearch.trim()) {
      const q = hubSearch.toLowerCase();
      return (
        plugin.name.toLowerCase().includes(q) ||
        plugin.packageName.toLowerCase().includes(q) ||
        (plugin.description.zh && plugin.description.zh.toLowerCase().includes(q)) ||
        (plugin.description.en && plugin.description.en.toLowerCase().includes(q)) ||
        plugin.tags.some((t: string) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const availableUpdateCount = Object.values(pluginUpdates).filter((u: PluginUpdateInfo) => u.hasUpdate).length;
  const officialCount = hubPlugins.filter((p) => p.isOfficial || p.compatibility === "official").length;
  const compatibleCount = hubPlugins.filter((p) => p.compatibility === "compatible").length;

  return (
    <section className="dshg-plugins">
      <div className="dshg-plugins__header">
        <div>
          <h2>{t("plugins.title")}</h2>
          <p className="dshg-settings__hint">{t("plugins.subtitle")}</p>
        </div>
        <div className="dshg-plugins__head-actions">
          <Button
            onClick={() => void openExternal(AWESOME_RADAR_REPO)}
            title="查看社区 286+ 插件兼容性雷达"
          >
            <Compass size={14} />
            <span>Awesome Radar (286+)</span>
          </Button>
          <Button
            onClick={() => {
              if (harness.state === "ready") setScene("session");
              else setError(t("plugins.needSession"));
            }}
          >
            <Puzzle size={14} />
            {t("plugins.openOfficial")}
          </Button>
        </div>
      </div>

      {feedback && <div className="dshg-plugins__feedback">{feedback}</div>}

      {/* Curated Plugin Hub (精选插件市场 + 兼容性雷达) */}
      <div className="dshg-plugins__hub-card">
        <div className="dshg-plugins__hub-head">
          <div className="dshg-plugins__hub-title-group">
            <div className="dshg-plugins__hub-title">
              <Sparkles size={16} />
              <h3>{t("plugins.hubTitle")}</h3>
              <span className="dshg-plugins__hub-count">({filteredHubPlugins.length})</span>
            </div>
            <p className="dshg-settings__hint">
              {t("plugins.hubSubtitle")}
              {lastSyncedAt > 0 && (
                <span className="dshg-plugins__synced-time">
                  {" "}· {t("plugins.lastSynced").replace("{time}", new Date(lastSyncedAt).toLocaleDateString())}
                </span>
              )}
            </p>
          </div>

          <div className="dshg-plugins__hub-sync-actions">
            <button
              type="button"
              className="dshg-plugins__sync-btn"
              disabled={isSyncingRadar}
              onClick={() => void handleSyncRadar()}
              title="从 GitHub/CDN 远程雷达拉取最新插件索引"
            >
              <RefreshCw size={12} className={isSyncingRadar ? "is-spinning" : ""} />
              <span>{isSyncingRadar ? t("plugins.syncingRadar") : t("plugins.syncRadar")}</span>
            </button>

            <button
              type="button"
              className="dshg-plugins__sync-btn"
              disabled={isCheckingUpdates}
              onClick={() => void handleCheckUpdates()}
              title="检查已安装插件的最新 npm/GitHub 版本"
            >
              <ArrowUpCircle size={12} className={isCheckingUpdates ? "is-spinning" : ""} />
              <span>{isCheckingUpdates ? t("plugins.checkingUpdates") : t("plugins.checkUpdates")}</span>
            </button>
          </div>
        </div>

        {/* Quick Radar Compatibility Overview Bar */}
        <div className="dshg-plugins__radar-bar">
          <div className="dshg-plugins__radar-stat">
            <span className="dshg-plugins__radar-dot is-official" />
            <span className="dshg-plugins__radar-label">官方认证</span>
            <span className="dshg-plugins__radar-val">{officialCount}</span>
          </div>
          <div className="dshg-plugins__radar-stat">
            <span className="dshg-plugins__radar-dot is-compatible" />
            <span className="dshg-plugins__radar-label">稳定可用</span>
            <span className="dshg-plugins__radar-val">{compatibleCount}</span>
          </div>
          <div className="dshg-plugins__radar-stat">
            <span className="dshg-plugins__radar-dot is-watch" />
            <span className="dshg-plugins__radar-label">总计收录</span>
            <span className="dshg-plugins__radar-val">{hubPlugins.length}+</span>
          </div>
        </div>

        {/* Update Notification Banner */}
        {availableUpdateCount > 0 && (
          <div className="dshg-plugins__update-banner">
            <div className="dshg-plugins__update-banner-left">
              <ArrowUpCircle size={15} />
              <span>{t("plugins.updateBanner").replace("{count}", String(availableUpdateCount))}</span>
            </div>
            <Button
              variant="primary"
              disabled={isUpdatingAll}
              onClick={() => void handleUpdateAll()}
            >
              <Download size={13} />
              <span>{isUpdatingAll ? t("plugins.updating") : t("plugins.updateAll")}</span>
            </Button>
          </div>
        )}

        {/* Hub Categories & Search Bar */}
        <div className="dshg-plugins__hub-controls">
          <div className="dshg-plugins__hub-chips">
            {[
              { id: "all" as const, label: t("plugins.cat.all"), icon: Layers },
              { id: "featured" as const, label: t("plugins.cat.featured"), icon: Sparkles },
              { id: "official" as const, label: t("plugins.cat.official"), icon: Check },
              { id: "ui" as const, label: t("plugins.cat.ui"), icon: Layout },
              { id: "agent" as const, label: t("plugins.cat.agent"), icon: Bot },
              { id: "memory" as const, label: t("plugins.cat.memory"), icon: FolderSync },
              { id: "dev" as const, label: t("plugins.cat.dev"), icon: Code },
              { id: "vision" as const, label: t("plugins.cat.vision"), icon: Sparkles },
              { id: "mcp" as const, label: t("plugins.cat.mcp"), icon: FolderSync },
            ].map((cat) => {
              const Icon = cat.icon;
              const isSelected = hubCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`dshg-plugins__hub-chip ${isSelected ? "is-active" : ""}`}
                  onClick={() => setHubCategory(cat.id)}
                >
                  <Icon size={12} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          <div className="dshg-plugins__hub-search">
            <Search size={12} />
            <input
              value={hubSearch}
              placeholder="搜索插件、标签或简介..."
              onChange={(e) => setHubSearch(e.target.value)}
            />
            {hubSearch && (
              <button
                type="button"
                className="dshg-plugins__clear-search"
                onClick={() => setHubSearch("")}
              >
                <X size={11} />
              </button>
            )}
          </div>
        </div>

        {/* Smooth Scrollable Plugin Hub Grid */}
        <div className="dshg-plugins__hub-scroll-wrapper">
          {filteredHubPlugins.length === 0 ? (
            <div className="dshg-plugins__hub-empty">
              <p>未找到符合条件的插件</p>
            </div>
          ) : (
            <div className="dshg-plugins__hub-grid">
              {filteredHubPlugins.map((plugin, idx) => {
                const clean = plugin.packageName.replace(/^npm:/, "").trim();
                const repoName = clean.includes("/") ? clean.split("/").at(-1)! : clean;
                const installedPkg = packages.find((p) => {
                  if (p.name === plugin.packageName || p.name === clean) return true;
                  if (p.name === repoName) return true;
                  if (clean.startsWith("github:") && p.name.includes(repoName)) return true;
                  return false;
                });
                const isInstalled = Boolean(installedPkg);
                const updateInfo = installedPkg ? pluginUpdates[installedPkg.name] : undefined;
                const hasUpdate = Boolean(updateInfo?.hasUpdate);
                const isInstalling = installingPkg === plugin.packageName;

                return (
                  <div
                    key={plugin.packageName}
                    className="dshg-plugins__hub-item"
                    style={{ animationDelay: `${Math.min(idx * 20, 200)}ms` }}
                  >
                    <div className="dshg-plugins__hub-item-head">
                      <div className="dshg-plugins__hub-name-group">
                        <span className="dshg-plugins__hub-name">{plugin.name}</span>
                        {plugin.compatibility === "official" ? (
                          <span
                            className="dshg-plugins__compat-badge is-official"
                            title="官方认证：由 DeepSeek 官方团队直接维护与支持"
                          >
                            官方认证
                          </span>
                        ) : plugin.compatibility === "compatible" ? (
                          <span
                            className="dshg-plugins__compat-badge is-compatible"
                            title="稳定可用：经过社区兼容性雷达每日全量测试，无冲突"
                          >
                            稳定可用
                          </span>
                        ) : (
                          <span
                            className="dshg-plugins__compat-badge is-watch"
                            title="社区测试：社区活跃贡献扩展，部分特性跟踪测试中"
                          >
                            社区测试
                          </span>
                        )}
                      </div>
                      <span className="dshg-plugins__hub-pkg">{plugin.packageName}</span>
                    </div>

                    <p className="dshg-plugins__hub-desc">
                      {plugin.description[locale as "zh" | "en"] ?? plugin.description.zh}
                    </p>

                    <div className="dshg-plugins__hub-tags">
                      {plugin.tags.map((tag: string) => (
                        <span key={tag} className="dshg-plugins__hub-tag">
                          {tag}
                        </span>
                      ))}
                      {plugin.stars && (
                        <span className="dshg-plugins__hub-tag is-stars">
                          ⭐ {plugin.stars}
                        </span>
                      )}
                    </div>

                    <div className="dshg-plugins__hub-footer">
                      {plugin.repoUrl ? (
                        <button
                          type="button"
                          className="dshg-plugins__repo-link"
                          title="查看 GitHub 源码仓库"
                          onClick={() => void openExternal(plugin.repoUrl!)}
                        >
                          GitHub
                        </button>
                      ) : (
                        <span />
                      )}

                      <div className="dshg-plugins__hub-actions">
                        {isInstalled ? (
                          <>
                            <span className="dshg-plugins__installed-chip">
                              <Check size={11} />
                              <span>{t("plugins.installedBadge")}</span>
                            </span>

                            {hasUpdate ? (
                              <Button
                                variant="primary"
                                disabled={isInstalling}
                                onClick={() => void installPackage(plugin.packageName)}
                                title={`升级至最新版本 v${updateInfo?.latestVersion}`}
                              >
                                {isInstalling ? t("plugins.updating") : t("plugins.updateNow")}
                              </Button>
                            ) : (
                              <button
                                type="button"
                                className="dshg-plugins__remove-icon-btn"
                                disabled={busy}
                                onClick={() => void removePlugin(clean)}
                                title="卸载插件"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </>
                        ) : (
                          <Button
                            variant="primary"
                            disabled={isInstalling || busy}
                            onClick={() => void installPackage(plugin.packageName)}
                          >
                            <Download size={12} />
                            <span>{isInstalling ? t("plugins.installing") : t("plugins.add")}</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>



      {/* Custom Plugin Install */}
      <div className="dshg-plugins__install">
        <label>{t("plugins.install")}</label>
        <p className="dshg-settings__hint">{t("plugins.installHint")}</p>
        <div className="dshg-plugins__install-row">
          <input
            value={packageDraft}
            onChange={(event) => setPackageDraft(event.target.value)}
            placeholder="@scope/package"
          />
          <Button
            variant="primary"
            disabled={installingPkg !== null || !packageDraft.trim()}
            onClick={() => void installPackage(packageDraft)}
          >
            {installingPkg === packageDraft ? t("plugins.installing") : t("plugins.add")}
          </Button>
        </div>
      </div>

      {/* Installed Packages List */}
      <div className="dshg-plugins__list">
        <div className="dshg-plugins__list-title">{t("plugins.installed")}</div>
        {packages.length === 0 ? (
          <p className="dshg-settings__hint">{t("plugins.empty")}</p>
        ) : (
          packages.map((item) => (
            <div key={item.name} className="dshg-plugins__row">
              <div className="dshg-plugins__row-main" style={{ cursor: "default" }}>
                <div className="dshg-plugins__row-title">
                  <span>{item.name}</span>
                  {item.isBundle && <em>{t("plugins.bundle")}</em>}
                </div>
                <div className="dshg-plugins__row-meta">{item.version}</div>
              </div>
              <button
                type="button"
                className="dshg-plugins__icon-btn"
                aria-label={t("plugins.remove")}
                onClick={() => {
                  if (window.confirm(t("plugins.removeConfirm").replace("{name}", item.name))) {
                    void removePlugin(item.name).catch((err) => setError(String(err)));
                  }
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))
        )}
      </div>

      {bundles.length > 0 && (
        <p className="dshg-settings__hint">
          {t("plugins.bundles")}: {bundles.join(", ")}
        </p>
      )}

      {/* MCP Servers Section */}
      <div className="dshg-plugins__mcp">
        <div className="dshg-plugins__mcp-head">
          <div>
            <h3>{t("plugins.mcp")}</h3>
            <p className="dshg-settings__hint">{t("plugins.mcpHint")}</p>
          </div>
          {mode === "closed" && (
            <Button
              variant="primary"
              onClick={() => {
                setForm(emptyMcpForm());
                setMode("create");
                setError(null);
              }}
            >
              <Plus size={14} />
              {t("plugins.mcpAdd")}
            </Button>
          )}
        </div>

        {/* 1-Click MCP Templates */}
        <div className="dshg-plugins__templates-card">
          <span className="dshg-plugins__templates-label">
            <FolderSync size={13} />
            {t("plugins.mcpTemplatesTitle")}
          </span>
          <div className="dshg-plugins__templates-chips">
            {MCP_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                className="dshg-plugins__tpl-chip"
                onClick={() => {
                  setForm(formFromTemplate(tpl));
                  setMode("create");
                  setError(null);
                }}
              >
                <Plus size={12} />
                <span>{tpl.displayName[locale as "zh" | "en"] ?? tpl.displayName.zh}</span>
              </button>
            ))}
          </div>
        </div>

        {mode !== "closed" && (
          <div className="dshg-plugins__form">
            <div className="dshg-plugins__form-title">
              <h3>{mode === "create" ? t("plugins.mcpAdd") : t("plugins.mcpEdit")}</h3>
              <button
                type="button"
                className="dshg-plugins__icon-btn"
                onClick={() => setMode("closed")}
              >
                <X size={16} />
              </button>
            </div>
            <label>{t("plugins.mcpId")}</label>
            <input
              value={form.id}
              disabled={mode === "edit"}
              onChange={(event) =>
                setForm((current) => ({ ...current, id: event.target.value }))
              }
              placeholder="mcp-filesystem"
            />
            <label>{t("plugins.mcpServerName")}</label>
            <input
              value={form.serverName}
              onChange={(event) =>
                setForm((current) => ({ ...current, serverName: event.target.value }))
              }
              placeholder="filesystem"
            />
            <label>{t("plugins.mcpTransport")}</label>
            <Select
              aria-label={t("plugins.mcpTransport")}
              value={form.transport}
              options={[
                { value: "stdio", label: "stdio" },
                { value: "streamable-http", label: "streamable-http" },
              ]}
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  transport: value as McpForm["transport"],
                }))
              }
            />
            {form.transport === "stdio" ? (
              <>
                <label>{t("plugins.mcpCommand")}</label>
                <input
                  value={form.command}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, command: event.target.value }))
                  }
                />
                <label>{t("plugins.mcpArgs")}</label>
                <input
                  value={form.argsText}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, argsText: event.target.value }))
                  }
                />
                <label>{t("plugins.mcpCwd")}</label>
                <input
                  value={form.cwd}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, cwd: event.target.value }))
                  }
                />
                <KvEditor
                  label={t("plugins.mcpEnv")}
                  hint={t("plugins.mcpEnvHint")}
                  pairs={form.env}
                  onChange={(env) => setForm((current) => ({ ...current, env }))}
                />
              </>
            ) : (
              <>
                <label>{t("plugins.mcpUrl")}</label>
                <input
                  value={form.url}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, url: event.target.value }))
                  }
                  placeholder="http://127.0.0.1:3000/mcp"
                />
                <KvEditor
                  label={t("plugins.mcpHeaders")}
                  hint={t("plugins.mcpHeadersHint")}
                  pairs={form.headers}
                  onChange={(headers) => setForm((current) => ({ ...current, headers }))}
                />
              </>
            )}
            <div className="dshg-settings__row">
              <Button variant="primary" disabled={busy} onClick={() => void saveMcp()}>
                {t("settings.save")}
              </Button>
              <Button disabled={busy} onClick={() => setMode("closed")}>
                {t("models.cancel")}
              </Button>
            </div>
          </div>
        )}

        {mcpServers.map((server) => (
          <div key={server.id} className="dshg-plugins__row">
            <button
              type="button"
              className="dshg-plugins__row-main"
              onClick={() => {
                setForm(formFromServer(server));
                setMode("edit");
                setError(null);
              }}
            >
              <div className="dshg-plugins__row-title">
                <span>{server.serverName || server.id}</span>
                <em>{server.transport}</em>
              </div>
              <div className="dshg-plugins__row-meta">
                {server.transport === "stdio"
                  ? `${server.command ?? ""} ${(server.args ?? []).join(" ")}`.trim()
                  : server.url}
              </div>
            </button>
            <button
              type="button"
              className="dshg-plugins__icon-btn"
              onClick={() => {
                if (
                  window.confirm(
                    t("plugins.mcpDeleteConfirm").replace("{name}", server.id),
                  )
                ) {
                  void deleteMcpServer(server.id).catch((err) => setError(String(err)));
                }
              }}

            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>

      {error && <p className="dshg-settings__warn">{error}</p>}

      <div className="dshg-plugins__paths">
        {profilePath && (
          <p className="dshg-settings__hint">
            {t("plugins.profilePath").replace("{path}", profilePath)}
          </p>
        )}
        {dshHome && (
          <Button
            onClick={() => {
              void openExternal(`file://${dshHome.replace(/\\/g, "/")}`);
            }}
          >
            {t("plugins.openHome")}
          </Button>
        )}
      </div>
    </section>
  );
}
