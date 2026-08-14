import { MessageSquare, Settings2, Sparkles } from "lucide-react";
import { useI18n } from "@/infrastructure/i18n";
import { useAppStore } from "@/app/stores/appStore";
import { useSlidingPill } from "@/app/hooks/useSlidingPill";
import type { SceneId } from "@/shared/types";
import "./FloatingTabBar.scss";

interface TabItem {
  id: SceneId;
  icon: typeof Sparkles;
  label: "nav.welcome" | "nav.session" | "nav.settings";
}

const TABS: TabItem[] = [
  { id: "welcome", icon: Sparkles, label: "nav.welcome" },
  { id: "session", icon: MessageSquare, label: "nav.session" },
  { id: "settings", icon: Settings2, label: "nav.settings" },
];

export function FloatingTabBar() {
  const { t } = useI18n();
  const active = useAppStore((s) => s.activeScene);
  const setScene = useAppStore((s) => s.setScene);
  const harness = useAppStore((s) => s.harness);
  const { trackRef, pill } = useSlidingPill<HTMLDivElement>(active, "x");

  return (
    <nav className="dshg-floating-bar" aria-label={t("nav.aria")}>
      <div
        ref={trackRef}
        className="dshg-floating-bar__track"
        role="tablist"
      >
        <span
          className={`dshg-floating-pill ${pill.ready ? "is-ready" : ""}`}
          aria-hidden="true"
          style={{
            transform: `translate3d(${pill.left}px, 0, 0)`,
            width: `${pill.width}px`,
            height: `${pill.height}px`,
          }}
        />

        {TABS.map((tab) => {
          const Icon = tab.icon;
          const selected = active === tab.id;
          const isLiveSession = tab.id === "session" && harness.state === "ready";

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              data-pill-active={selected ? "true" : "false"}
              className={`dshg-floating-bar__tab ${selected ? "is-active" : ""}`}
              onClick={() => setScene(tab.id)}
            >
              <span className="dshg-floating-bar__icon-wrapper">
                <Icon size={14} strokeWidth={selected ? 2.2 : 1.75} />
                {isLiveSession && <span className="dshg-floating-bar__live-dot" />}
              </span>
              <span className="dshg-floating-bar__label">{t(tab.label)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
