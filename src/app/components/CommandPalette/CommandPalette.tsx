import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Code,
  Folder,
  FolderOpen,
  HardDrive,
  MessageSquare,
  Moon,
  RotateCw,
  Search,
  Settings,
  Sparkles,
  Sun,
  Terminal,
  Zap,
} from "lucide-react";
import { useI18n } from "@/infrastructure/i18n";
import { useAppStore } from "@/app/stores/appStore";
import "./CommandPalette.scss";


interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: "scenes" | "actions" | "workspaces";
  icon: typeof Sparkles;
  action: () => void;
}

export function CommandPalette() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const setScene = useAppStore((s) => s.setScene);
  const workspacePath = useAppStore((s) => s.workspacePath);
  const recent = useAppStore((s) => s.recentWorkspaces);
  const openWorkspace = useAppStore((s) => s.openWorkspace);

  const theme = useAppStore((s) => s.theme);
  const applySettings = useAppStore((s) => s.applySettings);
  const toggleLogsDrawer = useAppStore((s) => s.toggleLogsDrawer);
  const openInEditor = useAppStore((s) => s.openInEditor);
  const openInTerminal = useAppStore((s) => s.openInTerminal);
  const revealInFileManager = useAppStore((s) => s.revealInFileManager);
  const updateAgentNow = useAppStore((s) => s.updateAgentNow);
  const reloadSession = useAppStore((s) => s.reloadSession);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Global shortcut listener for ⌘K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const commands = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [
      // Navigation
      {
        id: "scene-welcome",
        title: t("nav.welcome"),
        subtitle: "Jump to Welcome scene",
        category: "scenes",
        icon: Sparkles,
        action: () => {
          setScene("welcome");
          setOpen(false);
        },
      },
      {
        id: "scene-session",
        title: t("nav.session"),
        subtitle: "Jump to Agent session",
        category: "scenes",
        icon: MessageSquare,
        action: () => {
          setScene("session");
          setOpen(false);
        },
      },
      {
        id: "scene-settings",
        title: t("nav.settings"),
        subtitle: "Models, plugins & preferences",
        category: "scenes",
        icon: Settings,
        action: () => {
          setScene("settings");
          setOpen(false);
        },
      },

      // Actions
      {
        id: "act-open-folder",
        title: t("welcome.open"),
        subtitle: "Select and launch a local project directory",
        category: "actions",
        icon: FolderOpen,
        action: () => {
          setOpen(false);
          void openWorkspace();
        },
      },
      {
        id: "act-logs",
        title: t("toolbar.toggleLogs"),
        subtitle: "View stdout & stderr live console output",
        category: "actions",
        icon: Terminal,
        action: () => {
          toggleLogsDrawer();
          setOpen(false);
        },
      },
      {
        id: "act-refresh",
        title: t("toolbar.refresh"),
        subtitle: "Reload session web view iframe",
        category: "actions",
        icon: RotateCw,
        action: () => {
          reloadSession();
          setOpen(false);
        },
      },
      {
        id: "act-theme",
        title: theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme",
        subtitle: "Toggle appearance theme",
        category: "actions",
        icon: theme === "dark" ? Sun : Moon,
        action: () => {
          void applySettings({ theme: theme === "dark" ? "light" : "dark" });
          setOpen(false);
        },
      },
      {
        id: "act-update-agent",
        title: t("settings.updateAgent"),
        subtitle: "Check and update @deepseek-ai/dsh",
        category: "actions",
        icon: Zap,
        action: () => {
          setOpen(false);
          void updateAgentNow();
        },
      },
    ];

    if (workspacePath) {
      items.push(
        {
          id: "act-vscode",
          title: t("toolbar.openVsCode"),
          subtitle: `Open ${workspacePath} in VS Code`,
          category: "actions",
          icon: Code,
          action: () => {
            void openInEditor(workspacePath, "code");
            setOpen(false);
          },
        },
        {
          id: "act-terminal",
          title: t("toolbar.openTerminal"),
          subtitle: `Open terminal at ${workspacePath}`,
          category: "actions",
          icon: Terminal,
          action: () => {
            void openInTerminal(workspacePath);
            setOpen(false);
          },
        },
        {
          id: "act-finder",
          title: t("toolbar.revealFolder"),
          subtitle: `Show ${workspacePath} in file manager`,
          category: "actions",
          icon: Folder,
          action: () => {
            void revealInFileManager(workspacePath);
            setOpen(false);
          },
        },
      );
    }

    // Workspaces
    for (const ws of recent) {
      items.push({
        id: `ws-${ws.path}`,
        title: ws.name,
        subtitle: ws.path,
        category: "workspaces",
        icon: HardDrive,
        action: () => {
          void openWorkspace(ws.path);
          setOpen(false);
        },
      });
    }

    return items;
  }, [
    t,
    setScene,
    openWorkspace,
    toggleLogsDrawer,
    reloadSession,
    theme,
    applySettings,
    updateAgentNow,
    workspacePath,
    openInEditor,
    openInTerminal,
    revealInFileManager,
    recent,
  ]);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle?.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q),
    );
  }, [commands, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev === 0 ? Math.max(0, filteredCommands.length - 1) : prev - 1,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    }
  }

  if (!open) return null;

  return createPortal(
    <div className="dshg-cmd-overlay" onClick={() => setOpen(false)}>
      <div
        className="dshg-cmd-dialog"
        role="dialog"
        aria-label={t("command.palette.title")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dshg-cmd-header">
          <Search size={18} className="dshg-cmd-search-icon" />
          <input
            ref={inputRef}
            value={query}
            placeholder={t("command.palette.placeholder")}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <kbd className="dshg-cmd-kbd">ESC</kbd>
        </div>

        <div ref={listRef} className="dshg-cmd-list">
          {filteredCommands.length === 0 ? (
            <div className="dshg-cmd-empty">{t("command.palette.noResults")}</div>
          ) : (
            filteredCommands.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  className={`dshg-cmd-item ${isSelected ? "is-selected" : ""}`}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => item.action()}
                >
                  <div className="dshg-cmd-item-icon">
                    <Icon size={16} />
                  </div>
                  <div className="dshg-cmd-item-info">
                    <div className="dshg-cmd-item-title">{item.title}</div>
                    {item.subtitle && (
                      <div className="dshg-cmd-item-subtitle">{item.subtitle}</div>
                    )}
                  </div>
                  <span className="dshg-cmd-item-category">
                    {t(`command.palette.${item.category}`)}
                  </span>
                </div>
              );
            })
          )}
        </div>

        <div className="dshg-cmd-footer">
          <span>{t("command.palette.hint")}</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

