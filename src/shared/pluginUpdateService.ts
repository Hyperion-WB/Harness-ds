import {
  CURATED_PLUGINS,
  type CompatibilityStatus,
  type CuratedPlugin,
  type PluginCategory,
} from "./pluginCatalog";
import type { PluginPackage } from "./types";

const RADAR_SOURCES = [
  "https://raw.githubusercontent.com/AdamPlatin123/awesome-dsh-plugins/main/PLUGINS.md",
  "https://cdn.jsdelivr.net/gh/AdamPlatin123/awesome-dsh-plugins@main/PLUGINS.md",
  "https://raw.githubusercontent.com/AdamPlatin123/awesome-dsh-plugins/main/generated/plugins-md-repos.json",
  "https://cdn.jsdelivr.net/gh/AdamPlatin123/awesome-dsh-plugins@main/generated/plugins-md-repos.json",
];

const CACHE_KEY = "dsh_plugin_catalog_cache_v3";
const CACHE_TIME_KEY = "dsh_plugin_catalog_synced_at_v3";

export interface RadarSyncResult {
  success: boolean;
  plugins: CuratedPlugin[];
  syncedAt: number;
  newCount: number;
  source: "remote" | "cache" | "builtin";
  error?: string;
}

export interface PluginUpdateInfo {
  packageName: string;
  installedVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
}

/** Extract base package name from npm package specifier, handling scoped packages and version tags. */
export function extractPackageName(packageName: string): string | null {
  const stripped = packageName.replace(/^npm:/, "").trim();
  if (stripped.startsWith("github:") || !stripped) return null;
  const match = stripped.match(/^(@[^\/]+\/[^@]+|[^@\/]+)/);
  return match ? match[1] : null;
}

/** Check npm registry for latest version of a package. */
async function fetchLatestNpmVersion(packageName: string): Promise<string | null> {
  const cleanPkg = extractPackageName(packageName);
  if (!cleanPkg) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    // Use npmmirror / npmjs for fast response
    const res = await fetch(
      `https://registry.npmmirror.com/${encodeURIComponent(cleanPkg)}/latest`,
      { signal: controller.signal },
    ).catch(() =>
      fetch(`https://registry.npmjs.org/${encodeURIComponent(cleanPkg)}/latest`, {
        signal: controller.signal,
      }),
    );

    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as { version?: string };
    return data.version ?? null;
  } catch {
    return null;
  }
}

/** Compare semver versions (returns true if latest > current). */
export function isNewerVersion(current: string, latest: string): boolean {
  try {
    const cleanCur = current.replace(/^[^\d]*/, "").split("-")[0].split(".");
    const cleanLat = latest.replace(/^[^\d]*/, "").split("-")[0].split(".");

    for (let i = 0; i < 3; i++) {
      const c = parseInt(cleanCur[i] || "0", 10) || 0;
      const l = parseInt(cleanLat[i] || "0", 10) || 0;
      if (l > c) return true;
      if (l < c) return false;
    }
    return false;
  } catch {
    return current !== latest;
  }
}

/** Check all installed packages for available updates. */
export async function checkAllPluginUpdates(
  installedPackages: PluginPackage[],
): Promise<Record<string, PluginUpdateInfo>> {
  const results: Record<string, PluginUpdateInfo> = {};

  const promises = installedPackages.map(async (pkg) => {
    const latest = await fetchLatestNpmVersion(pkg.name);
    if (latest) {
      const hasUpdate = isNewerVersion(pkg.version || "0.0.0", latest);
      results[pkg.name] = {
        packageName: pkg.name,
        installedVersion: pkg.version,
        latestVersion: latest,
        hasUpdate,
      };
    }
  });

  await Promise.allSettled(promises);
  return results;
}

/** Automatically infer plugin category based on package metadata, tags, and descriptions. */
export function autoClassifyPlugin(raw: {
  category?: string;
  name?: string;
  packageName?: string;
  tags?: string[];
  description?: string | { zh?: string; en?: string };
  isOfficial?: boolean;
}): PluginCategory {
  if (
    raw.category &&
    ["official", "ui", "agent", "dev", "mcp"].includes(raw.category)
  ) {
    return raw.category as PluginCategory;
  }

  const pkg = (raw.packageName || "").toLowerCase();
  const name = (raw.name || "").toLowerCase();
  const tags = Array.isArray(raw.tags) ? raw.tags.map((t) => String(t).toLowerCase()) : [];
  const descText =
    typeof raw.description === "string"
      ? raw.description.toLowerCase()
      : typeof raw.description === "object" && raw.description !== null
        ? `${raw.description.zh || ""} ${raw.description.en || ""}`.toLowerCase()
        : "";

  const fullText = `${pkg} ${name} ${tags.join(" ")} ${descText}`;

  // 1. Official
  if (pkg.startsWith("@deepseek-ai/") || raw.isOfficial) {
    return "official";
  }

  // 2. MCP Protocols
  if (
    pkg.includes("mcp") ||
    name.includes("mcp") ||
    tags.includes("mcp") ||
    fullText.includes("modelcontextprotocol") ||
    fullText.includes("model context protocol")
  ) {
    return "mcp";
  }

  // 3. UI & Appearance Enhancements
  const uiSignals = [
    "theme", "skin", "icon", "ui", "input", "paste", "history", "stats", "tps",
    "progress", "view", "css", "layout", "visual", "composer", "style", "color",
    "render", "preview", "markdown", "button", "tab", "panel", "badge",
    "界面", "皮肤", "主题", "粘贴", "输入", "进度", "统计", "样式", "渲染", "预览", "字体"
  ];
  if (uiSignals.some((sig) => fullText.includes(sig))) {
    return "ui";
  }

  // 4. Agent Capabilities & Introspection
  const agentSignals = [
    "memory", "recall", "prompt", "plan", "workflow", "reason", "decision",
    "thought", "task", "todo", "agent", "evolve", "context", "routing",
    "subagent", "skill", "rag", "knowledge", "embedding", "vector", "llm",
    "记忆", "提示词", "规划", "决策", "思考", "任务", "智能体", "路由", "技能", "上下文", "知识库"
  ];
  if (agentSignals.some((sig) => fullText.includes(sig))) {
    return "agent";
  }

  // 5. Dev & System Tools
  const devSignals = [
    "git", "bash", "docker", "terminal", "python", "pty", "encoding", "compiler",
    "linter", "test", "debug", "shell", "exec", "process", "system", "file", "fs",
    "diff", "patch", "sandbox", "scm", "ci", "cli",
    "终端", "编码", "容器", "解释器", "调试", "脚本", "编译", "系统"
  ];
  if (devSignals.some((sig) => fullText.includes(sig))) {
    return "dev";
  }

  // Default fallback
  return "agent";
}

/** Parse PLUGINS.md markdown tables into CuratedPlugin objects */
export function parsePluginsMarkdown(markdown: string): CuratedPlugin[] {
  const lines = markdown.split("\n");
  const plugins: CuratedPlugin[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (
      !trimmed.startsWith("|") ||
      trimmed.includes("---") ||
      trimmed.includes("插件 | 仓库") ||
      trimmed.includes("Plugin | Repo")
    ) {
      continue;
    }

    const parts = trimmed
      .split("|")
      .map((p) => p.trim())
      .filter((_, i, arr) => i > 0 && i < arr.length - 1);

    if (parts.length >= 3) {
      const rawName = parts[0].replace(/[`*]/g, "").trim();
      const repoPart = parts[1];
      const match =
        repoPart.match(/\[([^\]]+)\]\((https:\/\/github\.com\/[^\)]+)\)/) ||
        repoPart.match(/https:\/\/github\.com\/[^\s\)]+/);
      const repoUrl = match ? match[2] || match[0] : "";
      const slugMatch = repoUrl.match(/github\.com\/([^\/]+\/[^\/\s#\?]+)/);
      const slug = slugMatch ? slugMatch[1] : "";
      const descText = parts[2] || "";
      const verdict = parts[3] || "";

      if (rawName && slug) {
        const packageName = `github:${slug}`;
        const author = slug.split("/")[0] || "community";
        const isOfficial = author.toLowerCase() === "deepseek" || slug.startsWith("deepseek-ai/");
        const compatibility: CompatibilityStatus = verdict.includes("✅")
          ? isOfficial
            ? "official"
            : "compatible"
          : verdict.includes("❌")
            ? "watch"
            : "compatible";

        const category = autoClassifyPlugin({
          name: rawName,
          packageName,
          description: descText,
          isOfficial,
        });

        plugins.push({
          name: rawName,
          packageName,
          repoUrl,
          description: {
            zh: descText,
            en: descText,
          },
          author,
          isOfficial,
          compatibility,
          category,
          tags: [category.toUpperCase(), ...(isOfficial ? ["Official"] : [])],
        });
      }
    }
  }

  return plugins;
}

/** Normalize any incoming remote radar plugin record into standard CuratedPlugin shape. */
export function normalizeRemotePlugin(raw: unknown): CuratedPlugin | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  const packageName = String(obj.packageName || obj.package || obj.name || "").trim();
  if (!packageName) return null;

  const rawName = String(obj.name || "").trim();
  const name =
    rawName && rawName !== packageName
      ? rawName
      : packageName.replace(/^github:[^/]+\//, "").replace(/^@[^/]+\//, "");

  let description: { zh: string; en: string } = { zh: "", en: "" };
  if (typeof obj.description === "string") {
    description = { zh: obj.description, en: obj.description };
  } else if (typeof obj.description === "object" && obj.description !== null) {
    const d = obj.description as Record<string, unknown>;
    const zh = String(d.zh || d.en || "");
    const en = String(d.en || d.zh || "");
    description = { zh, en };
  }

  let repoUrl = typeof obj.repoUrl === "string" ? obj.repoUrl.trim() : undefined;
  if (!repoUrl && packageName.startsWith("github:")) {
    const slug = packageName.replace(/^github:/, "");
    repoUrl = `https://github.com/${slug}`;
  }

  const author =
    typeof obj.author === "string" && obj.author.trim()
      ? obj.author.trim()
      : packageName.startsWith("github:")
        ? packageName.replace(/^github:/, "").split("/")[0] || "community"
        : packageName.startsWith("@")
          ? packageName.split("/")[0].replace("@", "")
          : "community";

  const isOfficial =
    Boolean(obj.isOfficial) ||
    packageName.startsWith("@deepseek-ai/") ||
    author.toLowerCase() === "deepseek";

  let compatibility: CompatibilityStatus = "compatible";
  if (isOfficial) {
    compatibility = "official";
  } else if (
    typeof obj.compatibility === "string" &&
    ["official", "compatible", "watch"].includes(obj.compatibility)
  ) {
    compatibility = obj.compatibility as CompatibilityStatus;
  }

  const category = autoClassifyPlugin({
    category: typeof obj.category === "string" ? obj.category : undefined,
    name,
    packageName,
    tags: Array.isArray(obj.tags) ? (obj.tags as string[]) : [],
    description,
    isOfficial,
  });

  const tags: string[] = Array.isArray(obj.tags)
    ? (obj.tags as unknown[]).map(String).filter(Boolean)
    : [];

  if (tags.length === 0) {
    tags.push(category.toUpperCase());
    if (isOfficial) tags.push("Official");
  }

  return {
    name,
    packageName,
    repoUrl,
    description,
    author,
    isOfficial,
    compatibility,
    category,
    tags,
  };
}

/** Get cached catalog if available. */
export function getCachedCatalog(): { plugins: CuratedPlugin[]; syncedAt: number } {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    const syncedAt = parseInt(localStorage.getItem(CACHE_TIME_KEY) || "0", 10);
    if (cached) {
      const parsed = JSON.parse(cached) as unknown;
      if (Array.isArray(parsed) && parsed.length > 0) {
        const normalized = parsed
          .map(normalizeRemotePlugin)
          .filter((p): p is CuratedPlugin => p !== null);
        if (normalized.length > 0) {
          return { plugins: normalized, syncedAt };
        }
      }
    }
  } catch {
    // fallback
  }
  return { plugins: CURATED_PLUGINS, syncedAt: 0 };
}

/** Fetch remote radar catalog from GitHub / CDN sources with high-resilience fallback. */
export async function syncRemoteRadarCatalog(customUrl?: string): Promise<RadarSyncResult> {
  const sources = customUrl?.trim() ? [customUrl.trim(), ...RADAR_SOURCES] : RADAR_SOURCES;

  for (const url of sources) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (!res.ok) continue;

      let remotePlugins: CuratedPlugin[] = [];

      if (url.endsWith(".md") || url.includes("PLUGINS.md")) {
        const text = await res.text();
        remotePlugins = parsePluginsMarkdown(text);
      } else {
        const raw = (await res.json()) as unknown;
        let rawList: unknown[] = [];

        if (Array.isArray(raw)) {
          rawList = raw;
        } else if (raw && typeof raw === "object") {
          const dict = raw as Record<string, unknown>;
          if (Array.isArray(dict.repos)) {
            // Handle plugins-md-repos.json
            rawList = (dict.repos as string[]).map((slug) => ({
              name: slug.split("/")[1] || slug,
              packageName: `github:${slug}`,
              repoUrl: `https://github.com/${slug}`,
              author: slug.split("/")[0] || "community",
            }));
          } else if (Array.isArray(dict.plugins)) {
            rawList = dict.plugins;
          } else if (Array.isArray(dict.items)) {
            rawList = dict.items;
          } else if (Array.isArray(dict.data)) {
            rawList = dict.data;
          }
        }

        remotePlugins = rawList
          .map(normalizeRemotePlugin)
          .filter((p): p is CuratedPlugin => p !== null);
      }

      if (remotePlugins.length > 0) {
        // Merge with built-in official plugins to ensure core plugins are never lost
        const mergedMap = new Map<string, CuratedPlugin>();
        for (const p of CURATED_PLUGINS) mergedMap.set(p.packageName, p);
        for (const p of remotePlugins) mergedMap.set(p.packageName, p);
        const merged = Array.from(mergedMap.values());

        const now = Date.now();
        localStorage.setItem(CACHE_KEY, JSON.stringify(merged));
        localStorage.setItem(CACHE_TIME_KEY, String(now));

        return {
          success: true,
          plugins: merged,
          syncedAt: now,
          newCount: merged.length,
          source: "remote",
        };
      }
    } catch {
      // try next source
    }
  }

  // Fallback to cache or builtin
  const cached = getCachedCatalog();
  return {
    success: false,
    plugins: cached.plugins,
    syncedAt: cached.syncedAt,
    newCount: cached.plugins.length,
    source: cached.syncedAt ? "cache" : "builtin",
    error: "远程镜像连接超时，已快速载入本地精选清单",
  };
}
