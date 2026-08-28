import { useState } from "react";
import {
  X,
  Package,
  ExternalLink,
  Download,
  Trash2,
  AlertCircle,
  Terminal,
  ShieldCheck,
  Cpu,
  Layers,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Button } from "@/component-library";
import { useAppStore } from "@/app/stores/appStore";
import type { CuratedPlugin } from "@/shared/pluginCatalog";
import "./PluginDetailDrawer.scss";

interface PluginDetailDrawerProps {
  plugin: CuratedPlugin | any | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PluginDetailDrawer({ plugin, isOpen, onClose }: PluginDetailDrawerProps) {
  const activeProfile = useAppStore((s) => s.activeProfile);
  const pluginPackages = useAppStore((s) => s.pluginPackages);
  const addPlugin = useAppStore((s) => s.addPlugin);
  const removePlugin = useAppStore((s) => s.removePlugin);
  const openInTerminal = useAppStore((s) => s.openInTerminal);
  const workspacePath = useAppStore((s) => s.workspacePath);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen || !plugin) return null;

  const isInstalled = pluginPackages.some(
    (p) => p.name === plugin.name || p.name === plugin.id,
  );

  async function handleInstall() {
    if (!plugin) return;
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await addPlugin(plugin.name || plugin.id);
      setSuccessMsg(`插件「${plugin.displayName || plugin.name}」已成功安装到 Profile: ${activeProfile}`);
    } catch (err: any) {
      setErrorMsg(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleUninstall() {
    if (!plugin) return;
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await removePlugin(plugin.name || plugin.id);
      setSuccessMsg(`插件已从 Profile「${activeProfile}」中移除`);
    } catch (err: any) {
      setErrorMsg(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dshg-plugin-drawer-overlay" onClick={onClose}>
      <div
        className="dshg-plugin-drawer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Drawer Header */}
        <div className="dshg-plugin-drawer__head">
          <div className="dshg-plugin-drawer__head-info">
            <div className="dshg-plugin-drawer__icon">
              <Package size={22} />
            </div>
            <div>
              <h2 className="dshg-plugin-drawer__title">
                {plugin.displayName || plugin.name}
              </h2>
              <code className="dshg-plugin-drawer__pkg-name">{plugin.name}</code>
            </div>
          </div>
          <button
            type="button"
            className="dshg-plugin-drawer__close"
            onClick={onClose}
            title="关闭详情"
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="dshg-plugin-drawer__body">
          {/* Status Messages */}
          {successMsg && (
            <div className="dshg-plugin-drawer__alert is-success">
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="dshg-plugin-drawer__alert is-error">
              <AlertCircle size={16} />
              <div className="dshg-plugin-drawer__alert-content">
                <strong>插件安装/执行遇到异常</strong>
                <p>{errorMsg}</p>
                <div className="dshg-plugin-drawer__diag-box">
                  <div className="dshg-plugin-drawer__diag-head">
                    <Terminal size={12} />
                    <span>手动修复终端命令 (Manual CLI Guidance):</span>
                  </div>
                  <code>dsh plugin --profile {activeProfile} add {plugin.name}</code>
                  <button
                    type="button"
                    className="dshg-plugin-drawer__diag-term-btn"
                    onClick={() => void openInTerminal(workspacePath || undefined)}
                  >
                    在 DSH 终端中执行
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Description Section */}
          <div className="dshg-plugin-drawer__section">
            <h4>插件简介</h4>
            <p className="dshg-plugin-drawer__desc">
              {plugin.description || "暂无详细描述。"}
            </p>
          </div>

          {/* Meta Info Grid */}
          <div className="dshg-plugin-drawer__grid">
            <div className="dshg-plugin-drawer__meta-card">
              <span className="dshg-meta-label">适用 Profile</span>
              <span className="dshg-meta-val">{activeProfile}</span>
            </div>
            <div className="dshg-plugin-drawer__meta-card">
              <span className="dshg-meta-label">插件分类</span>
              <span className="dshg-meta-val">{plugin.category || "通用扩展"}</span>
            </div>
            <div className="dshg-plugin-drawer__meta-card">
              <span className="dshg-meta-label">安全审核</span>
              <span className="dshg-meta-val is-verified">
                <ShieldCheck size={12} />
                <span>社区验证</span>
              </span>
            </div>
            <div className="dshg-plugin-drawer__meta-card">
              <span className="dshg-meta-label">MCP 支持</span>
              <span className="dshg-meta-val">
                <Cpu size={12} />
                <span>标准协议</span>
              </span>
            </div>
          </div>

          {/* Tags */}
          {plugin.tags && plugin.tags.length > 0 && (
            <div className="dshg-plugin-drawer__section">
              <h4>标签与能力</h4>
              <div className="dshg-plugin-drawer__tags">
                {plugin.tags.map((tag: string) => (
                  <span key={tag} className="dshg-plugin-drawer__tag">
                    <Layers size={10} />
                    <span>{tag}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* External Links */}
          <div className="dshg-plugin-drawer__section">
            <h4>外部链接与文档</h4>
            <div className="dshg-plugin-drawer__links">
              <a
                href={`https://www.npmjs.com/package/${plugin.name || plugin.packageName}`}
                target="_blank"
                rel="noreferrer"
                className="dshg-drawer-link"
              >
                <Package size={13} />
                <span>npm Package 详情</span>
                <ExternalLink size={11} />
              </a>
              {plugin.repoUrl && (
                <a
                  href={plugin.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="dshg-drawer-link"
                >
                  <span>GitHub 源代码仓库</span>
                  <ExternalLink size={11} />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="dshg-plugin-drawer__footer">
          {isInstalled ? (
            <Button
              variant="danger"
              disabled={loading}
              onClick={() => void handleUninstall()}
              className="dshg-btn-danger"
            >
              {loading ? <Loader2 size={14} className="is-spinning" /> : <Trash2 size={14} />}
              <span>从当前 Profile 卸载</span>
            </Button>
          ) : (
            <Button
              variant="primary"
              disabled={loading}
              onClick={() => void handleInstall()}
            >
              {loading ? <Loader2 size={14} className="is-spinning" /> : <Download size={14} />}
              <span>一键安装到 Profile「{activeProfile}」</span>
            </Button>
          )}
          <Button onClick={onClose}>关闭</Button>
        </div>
      </div>
    </div>
  );
}
