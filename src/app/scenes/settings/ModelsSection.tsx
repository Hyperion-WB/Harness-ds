import { useEffect, useMemo, useState } from "react";
import { Check, Plus, RotateCw, Trash2, X } from "lucide-react";
import { Button, Select } from "@/component-library";
import { useI18n } from "@/infrastructure/i18n";
import { useAppStore } from "@/app/stores/appStore";
import {
  API_PROTOCOLS,
  presetForVendor,
  vendorOptions,
  type ProviderVendor,
} from "@/shared/providerCatalog";
import type { ModelProvider, UpsertProviderInput } from "@/shared/types";
import "./ModelsSection.scss";

type FormMode = "closed" | "create" | "edit";

interface FormState {
  vendor: ProviderVendor;
  id: string;
  displayName: string;
  baseUrl: string;
  api: string;
  apiKeyEnv: string;
  apiKey: string;
  models: string[];
  customModel: string;
  useCatalogModels: boolean;
}

function emptyForm(vendor: ProviderVendor = "deepseek-official"): FormState {
  const preset = presetForVendor(vendor);
  return {
    vendor,
    id: preset.id,
    displayName: preset.displayName,
    baseUrl: preset.baseURL,
    api: preset.api ?? "openai-completions",
    apiKeyEnv: preset.apiKeyEnv,
    apiKey: "",
    models: preset.models.map((item) => item.id),
    customModel: "",
    useCatalogModels: vendor !== "custom" && vendor !== "deepseek-official",
  };
}

function formFromProvider(provider: ModelProvider): FormState {
  const vendor: ProviderVendor =
    provider.id === "deepseek-official"
      ? "deepseek-official"
      : provider.id === "openai"
        ? "openai"
        : provider.id === "anthropic"
          ? "anthropic"
          : provider.id === "deepseek"
            ? "deepseek"
            : "custom";
  const preset = presetForVendor(vendor);
  return {
    vendor,
    id: provider.id,
    displayName: provider.displayName,
    baseUrl: provider.baseUrl ?? preset.baseURL,
    api: provider.api ?? preset.api ?? "openai-completions",
    apiKeyEnv: provider.apiKeyEnv,
    apiKey: "",
    models: provider.models.length > 0 ? provider.models : preset.models.map((item) => item.id),
    customModel: "",
    useCatalogModels: provider.kind === "catalog" && provider.models.length === 0,
  };
}

export function ModelsSection() {
  const { t, locale } = useI18n();
  const providers = useAppStore((s) => s.modelProviders);
  const defaultModel = useAppStore((s) => s.defaultModel);
  const dshHome = useAppStore((s) => s.dshHome);
  const refreshModelProviders = useAppStore((s) => s.refreshModelProviders);
  const upsertModelProvider = useAppStore((s) => s.upsertModelProvider);
  const deleteModelProvider = useAppStore((s) => s.deleteModelProvider);
  const setDefaultModel = useAppStore((s) => s.setDefaultModel);

  const [mode, setMode] = useState<FormMode>("closed");
  const [form, setForm] = useState<FormState>(() => emptyForm());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [fetchFeedback, setFetchFeedback] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    void refreshModelProviders();
  }, [refreshModelProviders]);

  async function handleTestConnection() {
    setTesting(true);
    setTestResult(null);
    const start = performance.now();
    const url = form.baseUrl.trim() || preset.baseURL;
    try {
      if (!url) throw new Error("Base URL is empty");
      const endpoint = url.replace(/\/+$/, "") + (url.includes("anthropic") ? "/v1/models" : "/models");
      const headers: Record<string, string> = {};
      if (form.apiKey.trim()) {
        headers["Authorization"] = `Bearer ${form.apiKey.trim()}`;
        if (url.includes("anthropic")) headers["x-api-key"] = form.apiKey.trim();
      }
      const res = await fetch(endpoint, {
        method: "GET",
        headers,
      }).catch(() => {
        return fetch(url, { method: "HEAD" });
      });

      const elapsed = Math.round(performance.now() - start);
      if (res && (res.status === 401 || res.status === 403)) {
        setTestResult({ success: false, message: `401 Unauthorized (${elapsed}ms)` });
      } else {
        setTestResult({ success: true, message: t("models.testSuccess").replace("{ms}", String(elapsed)) });
      }
    } catch (err) {
      const elapsed = Math.round(performance.now() - start);
      setTestResult({ success: false, message: `${t("models.testFailed")}: ${String(err)} (${elapsed}ms)` });
    } finally {
      setTesting(false);
    }
  }

  async function handleFetchModelsFromApi() {
    const rawUrl = form.baseUrl.trim() || preset.baseURL;
    if (!rawUrl) {
      setFetchFeedback({ success: false, message: "请先填写 Base URL" });
      return;
    }
    const cleanUrl = rawUrl.replace(/\/+$/, "");
    setFetchingModels(true);
    setFetchFeedback(null);

    try {
      let endpoint = cleanUrl;
      if (cleanUrl.includes("ollama")) {
        endpoint = cleanUrl.endsWith("/v1") ? `${cleanUrl}/models` : `${cleanUrl}/api/tags`;
      } else if (cleanUrl.endsWith("/models")) {
        endpoint = cleanUrl;
      } else if (cleanUrl.endsWith("/v1")) {
        endpoint = `${cleanUrl}/models`;
      } else {
        endpoint = `${cleanUrl}/v1/models`;
      }

      const headers: Record<string, string> = {
        Accept: "application/json",
      };
      if (form.apiKey.trim()) {
        headers["Authorization"] = `Bearer ${form.apiKey.trim()}`;
        if (cleanUrl.includes("anthropic")) {
          headers["x-api-key"] = form.apiKey.trim();
          headers["anthropic-version"] = "2023-06-01";
        }
      }

      let res = await fetch(endpoint, { method: "GET", headers }).catch(() => null);
      if (!res || !res.ok) {
        const altEndpoint = endpoint.endsWith("/v1/models")
          ? `${cleanUrl}/models`
          : `${cleanUrl}/v1/models`;
        if (altEndpoint !== endpoint) {
          const altRes = await fetch(altEndpoint, { method: "GET", headers }).catch(() => null);
          if (altRes && altRes.ok) res = altRes;
        }
      }

      if (!res) {
        throw new Error("无法连接至该接口，请检查 Base URL 与网络连接");
      }
      if (res.status === 401 || res.status === 403) {
        throw new Error("API 密钥无效或未授权 (401/403 Unauthorized)");
      }
      if (!res.ok) {
        throw new Error(`接口请求返回异常: HTTP ${res.status} ${res.statusText}`);
      }

      const json = await res.json();
      let fetchedModelIds: string[] = [];

      if (Array.isArray(json?.data)) {
        fetchedModelIds = json.data
          .map((item: any) => (typeof item === "string" ? item : item?.id))
          .filter((id: any): id is string => typeof id === "string" && Boolean(id.trim()));
      } else if (Array.isArray(json?.models)) {
        fetchedModelIds = json.models
          .map((item: any) => item?.name || item?.id)
          .filter((id: any): id is string => typeof id === "string" && Boolean(id.trim()));
      } else if (Array.isArray(json)) {
        fetchedModelIds = json
          .map((item: any) => (typeof item === "string" ? item : item?.id || item?.name))
          .filter((id: any): id is string => typeof id === "string" && Boolean(id.trim()));
      }

      if (fetchedModelIds.length === 0) {
        throw new Error("接口返回成功但未能解析出模型列表");
      }

      // Sort models: prioritize chat/reasoner models
      fetchedModelIds.sort((a, b) => {
        const aChat = a.toLowerCase().includes("chat") || a.toLowerCase().includes("v3") || a.toLowerCase().includes("r1");
        const bChat = b.toLowerCase().includes("chat") || b.toLowerCase().includes("v3") || b.toLowerCase().includes("r1");
        if (aChat && !bChat) return -1;
        if (!aChat && bChat) return 1;
        return a.localeCompare(b);
      });

      setForm((current) => ({
        ...current,
        useCatalogModels: false,
        models: fetchedModelIds,
      }));

      setFetchFeedback({
        success: true,
        message: `成功从 API 接口获取到 ${fetchedModelIds.length} 个最新可用模型`,
      });
    } catch (err) {
      setFetchFeedback({
        success: false,
        message: `获取失败: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setFetchingModels(false);
    }
  }


  const preset = presetForVendor(form.vendor);
  const vendorSelectOptions = vendorOptions(locale);

  const defaultOptions = useMemo(() => {
    const options: Array<{ value: string; label: string }> = [];
    for (const provider of providers) {
      const models =
        provider.models.length > 0
          ? provider.models
          : presetForVendor(
              provider.id === "deepseek-official"
                ? "deepseek-official"
                : provider.id === "openai"
                  ? "openai"
                  : provider.id === "anthropic"
                    ? "anthropic"
                    : provider.id === "deepseek"
                      ? "deepseek"
                      : "custom",
            ).models.map((item) => item.id);
      const list = models.length > 0 ? models : ["(default)"];
      for (const model of list) {
        options.push({
          value: `${provider.id}::${model}`,
          label: `${provider.displayName} · ${model}`,
        });
      }
    }
    return options;
  }, [providers]);

  const defaultValue =
    defaultOptions.find(
      (option) => option.value === `${defaultModel.provider}::${defaultModel.model}`,
    )?.value ??
    defaultOptions[0]?.value ??
    "";

  function applyVendor(vendor: ProviderVendor) {
    setForm(emptyForm(vendor));
  }

  function openCreate() {
    setError(null);
    setForm(emptyForm("anthropic"));
    setMode("create");
  }

  function openEdit(provider: ModelProvider) {
    setError(null);
    setForm(formFromProvider(provider));
    setMode("edit");
  }

  function closeForm() {
    setMode("closed");
    setError(null);
  }

  function toggleModel(modelId: string) {
    setForm((current) => {
      const exists = current.models.includes(modelId);
      return {
        ...current,
        useCatalogModels: false,
        models: exists
          ? current.models.filter((item) => item !== modelId)
          : [...current.models, modelId],
      };
    });
  }

  function addCustomModel() {
    const id = form.customModel.trim();
    if (!id) return;
    setForm((current) => ({
      ...current,
      useCatalogModels: false,
      models: current.models.includes(id) ? current.models : [...current.models, id],
      customModel: "",
    }));
  }

  async function saveForm() {
    setBusy(true);
    setError(null);
    try {
      const kind = preset.kind;
      const models =
        form.useCatalogModels && kind === "catalog"
          ? []
          : form.models.map((item) => item.trim()).filter(Boolean);
      if (kind === "custom" && models.length === 0) {
        throw new Error(t("models.error.needModel"));
      }
      if (kind === "custom" && !form.id.trim()) {
        throw new Error(t("models.error.needId"));
      }
      if (kind === "custom" && !form.baseUrl.trim()) {
        throw new Error(t("models.error.needUrl"));
      }
      if (mode === "create" && !form.apiKey.trim() && !preset.apiKeyOptional) {
        const existing = providers.find((item) => item.id === (form.id || preset.id));
        if (!existing?.hasApiKey) {
          throw new Error(t("models.error.needKey"));
        }
      }

      const input: UpsertProviderInput = {
        id: form.id.trim() || preset.id,
        kind,
        displayName: form.displayName.trim() || preset.displayName || form.id,
        baseUrl: form.baseUrl.trim() || null,
        api: kind === "custom" ? form.api : null,
        apiKeyEnv: form.apiKeyEnv.trim() || preset.apiKeyEnv || null,
        apiKey: form.apiKey.trim() || (preset.apiKeyOptional && mode === "create" ? "ollama-local" : null),
        models,
      };
      await upsertModelProvider(input);
      closeForm();
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }


  return (
    <section className="dshg-models">
      <div className="dshg-models__header">
        <div>
          <h2>{t("settings.models")}</h2>
          <p className="dshg-settings__hint">{t("models.subtitle")}</p>
        </div>
        {mode === "closed" && (
          <Button variant="primary" onClick={openCreate}>
            <Plus size={14} />
            {t("models.add")}
          </Button>
        )}
      </div>

      <div className="dshg-models__default">
        <label>{t("models.default")}</label>
        <Select
          aria-label={t("models.default")}
          value={defaultValue}
          options={
            defaultOptions.length > 0
              ? defaultOptions
              : [{ value: "", label: t("models.defaultEmpty") }]
          }
          disabled={defaultOptions.length === 0}
          onChange={(value) => {
            const [provider, model] = value.split("::");
            if (provider && model) void setDefaultModel(provider, model);
          }}
        />
      </div>

      {mode !== "closed" && (
        <div className="dshg-models__form">
          <div className="dshg-models__form-title">
            <h3>{mode === "create" ? t("models.add") : t("models.edit")}</h3>
            <button type="button" className="dshg-models__icon-btn" onClick={closeForm} aria-label={t("models.cancel")}>
              <X size={16} />
            </button>
          </div>

          <label>{t("models.vendor")}</label>
          <Select
            aria-label={t("models.vendor")}
            value={form.vendor}
            options={vendorSelectOptions}
            disabled={mode === "edit"}
            onChange={(value) => applyVendor(value as ProviderVendor)}
          />

          {(form.vendor === "custom" || mode === "edit") && (
            <>
              <label>{t("models.providerId")}</label>
              <input
                value={form.id}
                disabled={mode === "edit" || !preset.idEditable}
                onChange={(event) => setForm((current) => ({ ...current, id: event.target.value }))}
                placeholder="my-gateway"
              />
            </>
          )}

          <label>{t("models.displayName")}</label>
          <input
            value={form.displayName}
            onChange={(event) =>
              setForm((current) => ({ ...current, displayName: event.target.value }))
            }
            placeholder={preset.displayName || "Acme Gateway"}
          />

          <label>{t("models.baseUrl")}</label>
          <input
            value={form.baseUrl}
            onChange={(event) => setForm((current) => ({ ...current, baseUrl: event.target.value }))}
            placeholder="https://api.example.com/v1"
          />

          {form.vendor === "custom" && (
            <>
              <label>{t("models.protocol")}</label>
              <Select
                aria-label={t("models.protocol")}
                value={form.api}
                options={[...API_PROTOCOLS]}
                onChange={(value) => setForm((current) => ({ ...current, api: value }))}
              />
              <label>{t("models.apiKeyEnv")}</label>
              <input
                value={form.apiKeyEnv}
                onChange={(event) =>
                  setForm((current) => ({ ...current, apiKeyEnv: event.target.value }))
                }
                placeholder="GATEWAY_API_KEY"
              />
            </>
          )}

          <label>{t("models.apiKey")}</label>
          <input
            type="password"
            autoComplete="off"
            value={form.apiKey}
            onChange={(event) => setForm((current) => ({ ...current, apiKey: event.target.value }))}
            placeholder={
              mode === "edit"
                ? t("models.apiKeyKeep")
                : preset.apiKeyOptional
                  ? t("models.apiKeyOptional")
                  : "sk-..."
            }
          />

          <div className="dshg-models__models-head">
            <label>{t("models.modelList")}</label>
            <div className="dshg-models__models-actions">
              <button
                type="button"
                className="dshg-models__fetch-btn"
                onClick={() => void handleFetchModelsFromApi()}
                disabled={fetchingModels}
                title="向当前配置的 Base URL 发起请求，自动拉取 API 实际支持的最新模型列表"
              >
                <RotateCw size={12} className={fetchingModels ? "is-spinning" : ""} />
                <span>{fetchingModels ? "正在请求接口..." : "从接口获取可用模型"}</span>
              </button>

              {preset.kind === "catalog" && (
                <button
                  type="button"
                  className={`dshg-models__link ${form.useCatalogModels ? "is-active" : ""}`}
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      useCatalogModels: !current.useCatalogModels,
                      models: !current.useCatalogModels
                        ? []
                        : preset.models.map((item) => item.id),
                    }))
                  }
                >
                  {t("models.useCatalog")}
                </button>
              )}
            </div>
          </div>

          {fetchFeedback && (
            <p className={`dshg-models__test-feedback ${fetchFeedback.success ? "is-success" : "is-error"}`}>
              {fetchFeedback.message}
            </p>
          )}

          {!form.useCatalogModels && (
            <>
              <div className="dshg-models__chips">
                {(preset.models.length > 0 ? preset.models : form.models.map((id) => ({ id, label: id }))).map(
                  (item) => {
                    const selected = form.models.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`dshg-models__chip ${selected ? "is-selected" : ""}`}
                        onClick={() => toggleModel(item.id)}
                      >
                        {selected && <Check size={12} />}
                        {item.label}
                      </button>
                    );
                  },
                )}
                {form.models
                  .filter((id) => !preset.models.some((item) => item.id === id))
                  .map((id) => (
                    <button
                      key={id}
                      type="button"
                      className="dshg-models__chip is-selected"
                      onClick={() => toggleModel(id)}
                    >
                      <Check size={12} />
                      {id}
                    </button>
                  ))}
              </div>
              <div className="dshg-models__add-model">
                <input
                  value={form.customModel}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, customModel: event.target.value }))
                  }
                  placeholder={t("models.customModelPlaceholder")}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addCustomModel();
                    }
                  }}
                />
                <Button onClick={addCustomModel}>{t("models.addModel")}</Button>
              </div>
            </>
          )}

          {error && <p className="dshg-settings__warn">{error}</p>}
          {testResult && (
            <p className={`dshg-models__test-feedback ${testResult.success ? "is-success" : "is-error"}`}>
              {testResult.message}
            </p>
          )}

          <div className="dshg-settings__row">
            <Button variant="primary" disabled={busy} onClick={() => void saveForm()}>
              {t("settings.save")}
            </Button>
            <Button disabled={busy || testing} onClick={() => void handleTestConnection()}>
              {testing ? t("models.testing") : t("models.testConnection")}
            </Button>
            <Button disabled={busy} onClick={closeForm}>
              {t("models.cancel")}
            </Button>
          </div>
        </div>
      )}


      <div className="dshg-models__list">
        {providers.length === 0 && mode === "closed" && (
          <div className="dshg-models__empty">
            <p>{t("models.empty")}</p>
            <Button variant="primary" onClick={openCreate}>
              <Plus size={14} />
              {t("models.add")}
            </Button>
          </div>
        )}

        {providers.map((provider) => {
          const isDefault = defaultModel.provider === provider.id;
          return (
            <div key={provider.id} className="dshg-models__row">
              <button type="button" className="dshg-models__row-main" onClick={() => openEdit(provider)}>
                <div className="dshg-models__row-title">
                  <span>{provider.displayName}</span>
                  {isDefault && <em>{t("models.badgeDefault")}</em>}
                </div>
                <div className="dshg-models__row-meta">
                  <span>{provider.id}</span>
                  <span>·</span>
                  <span>
                    {provider.models.length > 0
                      ? t("models.modelCount").replace("{n}", String(provider.models.length))
                      : t("models.catalogModels")}
                  </span>
                  <span>·</span>
                  <span className={provider.hasApiKey ? "is-ok" : "is-missing"}>
                    {provider.hasApiKey ? t("settings.apiKeyPresent") : t("settings.apiKeyMissing")}
                  </span>
                </div>
                {provider.baseUrl && <div className="dshg-models__row-url">{provider.baseUrl}</div>}
              </button>
              <button
                type="button"
                className="dshg-models__icon-btn"
                aria-label={t("models.delete")}
                onClick={() => {
                  if (window.confirm(t("models.deleteConfirm").replace("{name}", provider.displayName))) {
                    void deleteModelProvider(provider.id);
                  }
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          );
        })}
      </div>

      {dshHome && <p className="dshg-settings__hint">{t("models.storageHint").replace("{path}", dshHome)}</p>}
    </section>
  );
}
