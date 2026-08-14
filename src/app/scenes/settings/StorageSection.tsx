import { useEffect, useState } from "react";
import {
  Database,
  FolderOpen,
  HardDrive,
  RefreshCw,
  Trash2,
  CheckCircle2,
  FolderTree,
  FileCode,
  FolderInput,
} from "lucide-react";
import { Button } from "@/component-library";
import { useAppStore } from "@/app/stores/appStore";
import type { StorageInfo } from "@/shared/types";
import "./StorageSection.scss";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

export function StorageSection() {
  const host = useAppStore((s) => s.host);

  const [loading, setLoading] = useState(true);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [clearing, setClearing] = useState(false);
  const [clearedSuccess, setClearedSuccess] = useState(false);
  const [customPath, setCustomPath] = useState("");
  const [savingPath, setSavingPath] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  async function loadStorage() {
    setLoading(true);
    try {
      const [info, settings] = await Promise.all([
        host.getStorageInfo(),
        host.getSettings(),
      ]);
      setStorageInfo(info);
      setCustomPath(settings.dshHomeOverride ?? "");
    } catch (e) {
      console.error("Failed to load storage info", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStorage();
  }, []);

  async function handleClearCache() {
    setClearing(true);
    setClearedSuccess(false);
    try {
      const updated = await host.clearCache();
      setStorageInfo(updated);
      setClearedSuccess(true);
      setTimeout(() => setClearedSuccess(false), 3000);
    } catch (e) {
      console.error("Clear cache failed", e);
    } finally {
      setClearing(false);
    }
  }

  async function handleSaveCustomPath() {
    setSavingPath(true);
    setSavedSuccess(false);
    try {
      await host.saveSettings({ dshHomeOverride: customPath.trim() || undefined });
      setSavedSuccess(true);
      await loadStorage();
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.error("Save custom path failed", e);
    } finally {
      setSavingPath(false);
    }
  }

  async function handlePickCustomDir() {
    try {
      const picked = await host.pickWorkspaceDirectory("选择 DSH 数据存储目录");
      if (picked) {
        setCustomPath(picked);
      }
    } catch (e) {
      console.error("Pick directory failed", e);
    }
  }

  const totalSize = storageInfo
    ? storageInfo.agentPrefixSizeBytes +
      storageInfo.dshHomeSizeBytes +
      storageInfo.configDirSizeBytes +
      storageInfo.cacheSizeBytes
    : 0;

  return (
    <div className="dshg-storage-section">
      <div className="dshg-storage-section__header">
        <div>
          <h2>存储与数据管理</h2>
          <p className="dshg-storage-section__desc">
            查看 DeepSeek Harness 运行时、缓存和会话数据的实际磁盘占用，并支持一键清理与迁移路径以释放 C 盘空间。
          </p>
        </div>
        <Button
          onClick={loadStorage}
          disabled={loading}
          className="dshg-storage-section__refresh-btn"
        >
          <RefreshCw size={14} className={loading ? "is-spinning" : ""} />
          <span>刷新统计</span>
        </Button>
      </div>

      {/* Overview stats bar */}
      <div className="dshg-storage-section__overview-card">
        <div className="dshg-storage-section__overview-icon">
          <HardDrive size={28} />
        </div>
        <div className="dshg-storage-section__overview-text">
          <span className="dshg-storage-section__overview-label">总计磁盘占用空间</span>
          <span className="dshg-storage-section__overview-val">
            {loading ? "计算中..." : formatBytes(totalSize)}
          </span>
        </div>
        <div className="dshg-storage-section__overview-actions">
          <Button
            variant="primary"
            onClick={handleClearCache}
            disabled={clearing || loading}
            className="dshg-storage-section__clear-btn"
          >
            {clearing ? (
              <RefreshCw size={14} className="is-spinning" />
            ) : clearedSuccess ? (
              <CheckCircle2 size={14} className="is-success" />
            ) : (
              <Trash2 size={14} />
            )}
            <span>{clearedSuccess ? "已成功清理缓存" : "一键清理临时缓存"}</span>
          </Button>
        </div>
      </div>

      {/* Directory cards grid */}
      <div className="dshg-storage-section__grid">
        {/* Agent Prefix Runtime */}
        <div className="dshg-storage-card">
          <div className="dshg-storage-card__header">
            <div className="dshg-storage-card__title-box">
              <FileCode size={18} />
              <div>
                <h4>Agent 运行环境目录</h4>
                <span>存放 @deepseek-ai/dsh 依赖、二进制执行体及 CLI 工具</span>
              </div>
            </div>
            <span className="dshg-storage-card__badge">
              {loading ? "..." : formatBytes(storageInfo?.agentPrefixSizeBytes ?? 0)}
            </span>
          </div>
          <div className="dshg-storage-card__path" title={storageInfo?.agentPrefixPath}>
            {storageInfo?.agentPrefixPath || "正在解析..."}
          </div>
          <div className="dshg-storage-card__footer">
            <Button
              onClick={() => storageInfo?.agentPrefixPath && void host.openStorageDir(storageInfo.agentPrefixPath)}
            >
              <FolderOpen size={13} />
              <span>打开所在文件夹</span>
            </Button>
          </div>
        </div>

        {/* DSH Home Data */}
        <div className="dshg-storage-card">
          <div className="dshg-storage-card__header">
            <div className="dshg-storage-card__title-box">
              <Database size={18} />
              <div>
                <h4>Harness 数据与会话存储 (DSH_HOME)</h4>
                <span>存放会话日志 (JSONL)、持久化数据、插件配置与沙箱存储</span>
              </div>
            </div>
            <span className="dshg-storage-card__badge">
              {loading ? "..." : formatBytes(storageInfo?.dshHomeSizeBytes ?? 0)}
            </span>
          </div>
          <div className="dshg-storage-card__path" title={storageInfo?.dshHomePath}>
            {storageInfo?.dshHomePath || "正在解析..."}
          </div>
          <div className="dshg-storage-card__footer">
            <Button
              onClick={() => storageInfo?.dshHomePath && void host.openStorageDir(storageInfo.dshHomePath)}
            >
              <FolderOpen size={13} />
              <span>打开所在文件夹</span>
            </Button>
          </div>
        </div>

        {/* GUI App Config */}
        <div className="dshg-storage-card">
          <div className="dshg-storage-card__header">
            <div className="dshg-storage-card__title-box">
              <FolderTree size={18} />
              <div>
                <h4>桌面客户端配置目录</h4>
                <span>存放应用设置、窗口记忆与加密凭据钥匙串映射</span>
              </div>
            </div>
            <span className="dshg-storage-card__badge">
              {loading ? "..." : formatBytes(storageInfo?.configDirSizeBytes ?? 0)}
            </span>
          </div>
          <div className="dshg-storage-card__path" title={storageInfo?.configDirPath}>
            {storageInfo?.configDirPath || "正在解析..."}
          </div>
          <div className="dshg-storage-card__footer">
            <Button
              onClick={() => storageInfo?.configDirPath && void host.openStorageDir(storageInfo.configDirPath)}
            >
              <FolderOpen size={13} />
              <span>打开所在文件夹</span>
            </Button>
          </div>
        </div>

        {/* Temporary Cache */}
        <div className="dshg-storage-card">
          <div className="dshg-storage-card__header">
            <div className="dshg-storage-card__title-box">
              <Trash2 size={18} />
              <div>
                <h4>临时缓存与日志碎片</h4>
                <span>存放 npm 构建中间文件、进程日志与会话导出临时文件</span>
              </div>
            </div>
            <span className="dshg-storage-card__badge is-warn">
              {loading ? "..." : formatBytes(storageInfo?.cacheSizeBytes ?? 0)}
            </span>
          </div>
          <div className="dshg-storage-card__note">
            清理缓存不会影响您的 API Key、工作区配置或历史会话内容，可随时放心释放空间。
          </div>
          <div className="dshg-storage-card__footer">
            <Button
              onClick={handleClearCache}
              disabled={clearing}
            >
              <Trash2 size={13} />
              <span>{clearing ? "清理中..." : "清理临时文件"}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Custom Storage Path Migration Box */}
      <div className="dshg-storage-migration">
        <div className="dshg-storage-migration__title">
          <FolderInput size={18} />
          <h4>自定义数据存储路径 (迁移至非 C 盘)</h4>
        </div>
        <p className="dshg-storage-migration__desc">
          默认情况下数据保存在系统盘用户目录（<code>~/.dsh</code>）。若您希望避免占用 C 盘，可在此指定其他分区目录（如 <code>D:\HarnessData</code>）。
        </p>

        <div className="dshg-storage-migration__input-row">
          <input
            type="text"
            className="dshg-storage-migration__input"
            value={customPath}
            placeholder="留空则使用默认 ~/.dsh 目录"
            onChange={(e) => setCustomPath(e.target.value)}
          />
          <Button onClick={handlePickCustomDir}>
            <FolderOpen size={14} />
            <span>浏览...</span>
          </Button>
          <Button
            variant="primary"
            onClick={handleSaveCustomPath}
            disabled={savingPath}
          >
            {savingPath ? (
              <RefreshCw size={14} className="is-spinning" />
            ) : savedSuccess ? (
              <CheckCircle2 size={14} />
            ) : null}
            <span>{savedSuccess ? "已保存" : "保存路径"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
