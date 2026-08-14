import { describe, expect, it } from "vitest";
import { BUILTIN_PRESETS } from "./presetCatalog";
import { PROVIDER_VENDORS, presetForVendor, vendorOptions } from "./providerCatalog";
import { MCP_TEMPLATES } from "./mcpCatalog";
import { CURATED_PLUGINS } from "./pluginCatalog";

describe("catalogs integrity", () => {
  it("verifies all builtin agent presets have required fields and snippets", () => {
    expect(BUILTIN_PRESETS.length).toBeGreaterThanOrEqual(4);
    for (const preset of BUILTIN_PRESETS) {
      expect(preset.id).toBeTruthy();
      expect(preset.name).toBeTruthy();
      expect(preset.description.zh).toBeTruthy();
      expect(preset.description.en).toBeTruthy();
      expect(preset.configSnippet).toContain("preset:");
      expect(preset.features.length).toBeGreaterThan(0);
    }
  });

  it("verifies provider vendor presets and vendorOptions", () => {
    expect(PROVIDER_VENDORS.length).toBeGreaterThanOrEqual(10);
    const deepseek = presetForVendor("deepseek-official");
    expect(deepseek.id).toBe("deepseek-official");
    expect(deepseek.baseURL).toBe("https://api.deepseek.com");

    const zhOptions = vendorOptions("zh");
    const enOptions = vendorOptions("en");
    expect(zhOptions.length).toBe(PROVIDER_VENDORS.length);
    expect(enOptions.length).toBe(PROVIDER_VENDORS.length);
  });

  it("verifies MCP templates structure", () => {
    expect(MCP_TEMPLATES.length).toBeGreaterThanOrEqual(5);
    for (const tpl of MCP_TEMPLATES) {
      expect(tpl.id).toBeTruthy();
      expect(tpl.serverName).toBeTruthy();
      expect(tpl.displayName.zh).toBeTruthy();
      expect(tpl.displayName.en).toBeTruthy();
      expect(tpl.transport).toMatch(/stdio|streamable-http/);
    }
  });

  it("verifies curated plugins list has valid category and tags", () => {
    expect(CURATED_PLUGINS.length).toBeGreaterThanOrEqual(10);
    for (const plugin of CURATED_PLUGINS) {
      expect(plugin.name).toBeTruthy();
      expect(plugin.packageName).toBeTruthy();
      expect(plugin.description.zh).toBeTruthy();
      expect(plugin.description.en).toBeTruthy();
      expect(["official", "compatible", "watch"]).toContain(plugin.compatibility);
      expect(plugin.tags.length).toBeGreaterThan(0);
    }
  });
});
