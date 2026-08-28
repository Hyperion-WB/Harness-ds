import { useState } from "react";
import { Check, Loader2, RefreshCw, X } from "lucide-react";
import { Button } from "@/component-library";
import { useAppStore } from "@/app/stores/appStore";
import {
  presetForVendor,
  type ProviderVendor,
} from "@/shared/providerCatalog";
import "./SetupWizardModal.scss";

interface SetupWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WIZARD_VENDORS: Array<{ id: ProviderVendor; name: string; desc: string }> = [
  { id: "deepseek-official", name: "DeepSeek 官方", desc: "原生官方 API (api.deepseek.com)" },
  { id: "siliconflow", name: "硅基流动", desc: "高并发高速推理网关" },
  { id: "ollama", name: "Ollama 本地", desc: "本地离线运行 (无需 API Key)" },
  { id: "openrouter", name: "OpenRouter", desc: "全球多模型聚合服务" },
  { id: "moonshot", name: "Moonshot / Kimi", desc: "月之暗面长上下文" },
  { id: "custom", name: "自定义接口", desc: "兼容 OpenAI 规范的任何端点" },
];

export function SetupWizardModal({ isOpen, onClose }: SetupWizardModalProps) {
  const upsertModelProvider = useAppStore((s) => s.upsertModelProvider);
  const setDefaultModel = useAppStore((s) => s.setDefaultModel);
  const refreshModelProviders = useAppStore((s) => s.refreshModelProviders);

  const [vendor, setVendor] = useState<ProviderVendor>("deepseek-official");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://api.deepseek.com");
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [fetching, setFetching] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  function handleSelectVendor(v: ProviderVendor) {
    setVendor(v);
    const p = presetForVendor(v);
    setBaseUrl(p.baseURL);
    setFetchedModels([]);
    setSelectedModel("");
    setFeedback(null);
  }

  async function handleAutoFetchModels() {
    const rawUrl = baseUrl.trim();
    if (!rawUrl) {
      setFeedback({ success: false, text: "请先填写 Base URL 接口地址" });
      return;
    }
    const cleanUrl = rawUrl.replace(/\/+$/, "");
    setFetching(true);
    setFeedback(null);

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

      const headers: Record<string, string> = { Accept: "application/json" };
      if (apiKey.trim()) {
        headers["Authorization"] = `Bearer ${apiKey.trim()}`;
      }

      let res = await fetch(endpoint, { method: "GET", headers }).catch(() => null);
      if (!res || !res.ok) {
        const alt = endpoint.endsWith("/v1/models") ? `${cleanUrl}/models` : `${cleanUrl}/v1/models`;
        if (alt !== endpoint) {
          const altRes = await fetch(alt, { method: "GET", headers }).catch(() => null);
          if (altRes && altRes.ok) res = altRes;
        }
      }

      if (!res) {
        throw new Error("无法连接至该接口，请检查 Base URL 与网络连接");
      }
      if (res.status === 401 || res.status === 403) {
        throw new Error("API Key 无效或未授权 (401/403 Unauthorized)");
      }
      if (!res.ok) {
        throw new Error(`接口响应错误: HTTP ${res.status}`);
      }

      const data = await res.json();
      let list: string[] = [];

      if (Array.isArray(data)) {
        list = data.map((item: any) => item?.id || item?.name || String(item));
      } else if (Array.isArray(data?.data)) {
        list = data.data.map((item: any) => item?.id || item?.name || String(item));
      } else if (Array.isArray(data?.models)) {
        list = data.models.map((item: any) => item?.name || item?.id || String(item));
      }

      list = list.filter(Boolean);
      if (list.length === 0) {
        throw new Error("未在该端点解析到可用模型列表");
      }

      setFetchedModels(list);
      setSelectedModel(list[0]);
      setFeedback({ success: true, text: `成功获取 ${list.length} 个可用模型！已自动选中首选模型。` });
    } catch (e: any) {
      setFeedback({ success: false, text: e?.message || String(e) });
    } finally {
      setFetching(false);
    }
  }

  async function handleSaveAndStart() {
    setSaving(true);
    try {
      const p = presetForVendor(vendor);
      const chosenModel = selectedModel.trim() || fetchedModels[0] || (vendor === "deepseek-official" ? "deepseek-chat" : "");
      
      await upsertModelProvider({
        kind: p.kind,
        id: p.id,
        displayName: p.displayName,
        baseUrl: baseUrl.trim() || p.baseURL,
        api: p.api ?? "openai-completions",
        apiKeyEnv: p.apiKeyEnv,
        apiKey: apiKey.trim() || undefined,
        models: fetchedModels.length > 0 ? fetchedModels : (chosenModel ? [chosenModel] : []),
      });

      if (chosenModel) {
        await setDefaultModel(p.id, chosenModel);
      }

      await refreshModelProviders();
      onClose();
    } catch (e: any) {
      setFeedback({ success: false, text: `保存失败: ${e?.message || String(e)}` });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dshg-wizard-overlay" onClick={onClose}>
      <div className="dshg-wizard-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dshg-wizard-modal__head">
          <div>
            <h2>模型服务接入向导 (Model Setup)</h2>
            <p>首次运行请接入模型 API Key，或连接本地 Ollama 服务即可开始。</p>
          </div>
          <button type="button" className="dshg-wizard-modal__close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="dshg-wizard-modal__body">
          {/* Provider Selection */}
          <div className="dshg-wizard-modal__field">
            <label>选择模型提供商</label>
            <div className="dshg-wizard-modal__provider-chips">
              {WIZARD_VENDORS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  className={`dshg-wizard-modal__provider-chip ${vendor === v.id ? "is-selected" : ""}`}
                  onClick={() => handleSelectVendor(v.id)}
                >
                  <span>{v.name}</span>
                  <small>{v.desc}</small>
                </button>
              ))}
            </div>
          </div>

          {/* Base URL */}
          <div className="dshg-wizard-modal__field">
            <label>接口地址 (Base URL)</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.deepseek.com"
            />
          </div>

          {/* API Key Input */}
          <div className="dshg-wizard-modal__field">
            <label>API Key {vendor === "ollama" ? "(本地服务可选)" : "(必填)"}</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={vendor === "ollama" ? "Ollama 本地运行无需 Key" : "sk-..."}
            />
          </div>

          {/* Live Fetch Button & Dynamic Model Selector */}
          <div className="dshg-wizard-modal__field">
            <label>可用模型 (从厂商实时获取)</label>
            <div className="dshg-wizard-modal__fetch-row">
              <button
                type="button"
                className="dshg-wizard-modal__fetch-btn"
                onClick={() => void handleAutoFetchModels()}
                disabled={fetching}
              >
                {fetching ? <Loader2 size={13} className="is-spinning" /> : <RefreshCw size={13} />}
                <span>{fetching ? "正在获取模型..." : "自动获取模型列表"}</span>
              </button>

              {fetchedModels.length > 0 ? (
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                >
                  {fetchedModels.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="点击左侧自动获取，或手动输入模型 ID"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                />
              )}
            </div>
          </div>

          {feedback && (
            <div
              className={`dshg-wizard-modal__feedback ${
                feedback.success ? "is-success" : "is-error"
              }`}
            >
              {feedback.text}
            </div>
          )}
        </div>

        <div className="dshg-wizard-modal__foot">
          <Button onClick={onClose}>暂不配置</Button>
          <Button variant="primary" onClick={() => void handleSaveAndStart()} disabled={saving}>
            {saving ? <Loader2 size={14} className="is-spinning" /> : <Check size={14} />}
            <span>完成配置并进入</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
