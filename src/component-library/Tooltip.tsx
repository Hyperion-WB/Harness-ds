import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import "./Tooltip.scss";

type Side = "bottom" | "right";

export function Tooltip({
  content,
  children,
  side = "bottom",
}: {
  content: string;
  children: ReactNode;
  side?: Side;
}) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const tipId = useId();

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const update = () => {
      const box = triggerRef.current?.getBoundingClientRect();
      if (!box) return;
      if (side === "right") {
        setCoords({ top: box.top + box.height / 2, left: box.right + 8 });
      } else {
        setCoords({ top: box.bottom + 6, left: box.left + box.width / 2 });
      }
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, side, content]);

  return (
    <>
      <span
        ref={triggerRef}
        className="dshg-tooltip-trigger"
        aria-describedby={open ? tipId : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        {children}
      </span>
      {open &&
        createPortal(
          <span
            id={tipId}
            role="tooltip"
            className={`dshg-tooltip-layer ${side === "right" ? "dshg-tooltip-layer--side" : ""}`}
            style={{ top: coords.top, left: coords.left }}
          >
            {content}
          </span>,
          document.body,
        )}
    </>
  );
}
