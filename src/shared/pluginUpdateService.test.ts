import { describe, expect, it } from "vitest";
import {
  autoClassifyPlugin,
  extractPackageName,
  getCachedCatalog,
  isNewerVersion,
  normalizeRemotePlugin,
  parsePluginsMarkdown,
} from "./pluginUpdateService";
import { CURATED_PLUGINS } from "./pluginCatalog";

describe("pluginUpdateService", () => {
  it("compares semver versions accurately", () => {
    expect(isNewerVersion("0.1.0", "0.2.0")).toBe(true);
    expect(isNewerVersion("1.0.0", "1.0.1")).toBe(true);
    expect(isNewerVersion("0.2.1", "0.2.1")).toBe(false);
    expect(isNewerVersion("1.5.0", "1.4.9")).toBe(false);
    expect(isNewerVersion("^0.1.0", "0.2.0")).toBe(true);
    expect(isNewerVersion("~1.2.0", "1.3.0")).toBe(true);
    expect(isNewerVersion("v1.2.3", "v1.2.4")).toBe(true);
    expect(isNewerVersion("1.0", "1.0.1")).toBe(true);
    expect(isNewerVersion("1.0.1", "1.0")).toBe(false);
  });

  it("extracts package name accurately for npm and scoped packages", () => {
    expect(extractPackageName("@deepseek-ai/dsh-mcp-client")).toBe("@deepseek-ai/dsh-mcp-client");
    expect(extractPackageName("@deepseek-ai/dsh-mcp-client@1.2.3")).toBe("@deepseek-ai/dsh-mcp-client");
    expect(extractPackageName("@scope/name@latest")).toBe("@scope/name");
    expect(extractPackageName("npm:@scope/name")).toBe("@scope/name");
    expect(extractPackageName("lodash@4.17.21")).toBe("lodash");
    expect(extractPackageName("express")).toBe("express");
    expect(extractPackageName("github:user/repo")).toBeNull();
    expect(extractPackageName("")).toBeNull();
  });

  it("auto-classifies plugin categories intelligently", () => {
    expect(
      autoClassifyPlugin({
        packageName: "@deepseek-ai/dsh-plugin-search",
        name: "Web Search",
      }),
    ).toBe("official");

    expect(
      autoClassifyPlugin({
        packageName: "github:user/custom-mcp-server",
        name: "Custom MCP",
        tags: ["mcp", "tools"],
      }),
    ).toBe("mcp");

    expect(
      autoClassifyPlugin({
        packageName: "github:dsh-external/dsh-skins",
        name: "DSH Skins",
        description: "第三方皮肤库与动态背景",
      }),
    ).toBe("ui");

    expect(
      autoClassifyPlugin({
        packageName: "github:dsh-external/dsh-memory",
        name: "Memory Recall",
        description: "跨会话长期记忆存储",
      }),
    ).toBe("agent");

    expect(
      autoClassifyPlugin({
        packageName: "github:dsh-external/dsh-pty",
        name: "PTY Adapter",
        description: "终端 PTY 进程与编码",
      }),
    ).toBe("dev");
  });

  it("normalizes diverse remote plugin shapes into valid CuratedPlugin objects", () => {
    const rawSimple = {
      name: "Input History",
      package: "github:dsh-external/dsh-input-history",
      description: "Web 消息输入历史快捷键",
    };
    const normalized = normalizeRemotePlugin(rawSimple);
    expect(normalized).not.toBeNull();
    expect(normalized?.name).toBe("Input History");
    expect(normalized?.packageName).toBe("github:dsh-external/dsh-input-history");
    expect(normalized?.repoUrl).toBe("https://github.com/dsh-external/dsh-input-history");
    expect(normalized?.category).toBe("ui");
    expect(normalized?.description.zh).toBe("Web 消息输入历史快捷键");
    expect(normalized?.author).toBe("dsh-external");
  });

  it("parses PLUGINS.md markdown tables accurately", () => {
    const md = `
# PLUGINS.md — 插件登记清单

| 插件 | 仓库 | 说明 | 运行级 |
| deepseek-heartflow | [yun520-1/deepseek-heartflow](https://github.com/yun520-1/deepseek-heartflow) | 心虫（AGI 第1层辨别门禁） | ✅ |
| dsh-repo-context | [qing3a/dsh-repo-context](https://github.com/qing3a/dsh-repo-context) | 把 git 状态注入 system prompt | ✅ |
| dsh-broken | [broken/repo](https://github.com/broken/repo) | 不兼容插件测试 | ❌ |
`;
    const plugins = parsePluginsMarkdown(md);
    expect(plugins.length).toBe(3);
    expect(plugins[0].name).toBe("deepseek-heartflow");
    expect(plugins[0].packageName).toBe("github:yun520-1/deepseek-heartflow");
    expect(plugins[0].compatibility).toBe("compatible");
    expect(plugins[2].compatibility).toBe("watch");
  });

  it("falls back to built-in curated plugins when cache is empty", () => {
    const catalog = getCachedCatalog();
    expect(catalog.plugins.length).toBeGreaterThanOrEqual(CURATED_PLUGINS.length);
    expect(catalog.plugins.some((p) => p.packageName === "@deepseek-ai/dsh-mcp-client")).toBe(true);
  });
});
