// components/SortDropdown.tsx
"use client";
import React, {
  useState,
  useRef,
  useEffect,
  MutableRefObject,
} from "react";
import { createPortal } from "react-dom";
import { m, AnimatePresence } from "framer-motion";
import { Calendar, Eye, List, Filter, ChevronDown, Check } from "lucide-react";

type SortKey = "recent" | "popular" | "title";

const options: { key: SortKey; label: string; icon: React.ReactNode }[] = [
  { key: "recent", label: "Plus récentes", icon: <Calendar className="w-4 h-4" /> },
  { key: "popular", label: "Plus populaires", icon: <Eye className="w-4 h-4" /> },
  { key: "title", label: "Par titre", icon: <List className="w-4 h-4" /> },
];

export function SortDropdown({
  sortBy,
  setSortBy,
}: {
  sortBy: SortKey;
  setSortBy: (k: SortKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [highlight, setHighlight] = useState(
    options.findIndex((o) => o.key === sortBy),
  );
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLUListElement | null>(null);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number; minWidth: number } | null>(null);

  useEffect(() => setMounted(true), []);

  // keep highlight in sync with external sortBy
  useEffect(() => {
    setHighlight(options.findIndex((o) => o.key === sortBy));
  }, [sortBy]);

  const updatePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const minWidth = Math.max(160, rect.width);
    let left = rect.left;
    let top = rect.bottom + 8;

    const viewportWidth = window.innerWidth;
    if (left + minWidth > viewportWidth - 8) {
      left = Math.max(8, viewportWidth - minWidth - 8);
    }
    // ensure not off top/bottom (simple clamp)
    const viewportHeight = window.innerHeight;
    if (top + 300 > viewportHeight - 8) {
      // try open above trigger if not enough space below
      top = Math.max(8, rect.top - 8 - 300); // 300 = approx menu height
    }

    setMenuStyle({ top, left, minWidth });
  };

  // reposition when opened
  useEffect(() => {
    if (!open) return;
    // ensure layout updated, then calc position
    requestAnimationFrame(() => {
      updatePosition();
    });

    const onResize = () => updatePosition();
    window.addEventListener("resize", onResize);
    // listen scroll on capture so we catch scrolls inside any container
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open]);

  // outside click & keyboard nav
  useEffect(() => {
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current && triggerRef.current.contains(t)) return;
      if (menuRef.current && menuRef.current.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((h) => Math.min(h + 1, options.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((h) => Math.max(h - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const opt = options[highlight];
        if (opt) {
          setSortBy(opt.key);
          setOpen(false);
        }
      }
    }

    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, highlight, setSortBy]);

  // build menu portal (only when mounted)
  const portal = mounted
    ? createPortal(
        <AnimatePresence>
          {open && (
            <m.ul
              ref={menuRef as MutableRefObject<HTMLUListElement>}
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.14 }}
              role="listbox"
              aria-label="Trier les vidéos"
              style={{
                position: "fixed",
                top: menuStyle ? `${menuStyle.top}px` : "0px",
                left: menuStyle ? `${menuStyle.left}px` : "0px",
                minWidth: menuStyle ? `${menuStyle.minWidth}px` : undefined,
                zIndex: 99999,
              }}
              className="bg-slate-900/95 border border-slate-700 rounded-xl shadow-2xl backdrop-blur-md z-[99999] ring-1 ring-black/20"
            >
              {options.map((opt, i) => {
                const isSelected = opt.key === sortBy;
                const isHighlighted = i === highlight;
                return (
                  <li
                    key={opt.key}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => {
                      setSortBy(opt.key);
                      setOpen(false);
                    }}
                    className={`flex items-center justify-between gap-3 px-4 py-3 cursor-pointer transition-colors duration-150 ${
                      isHighlighted ? "bg-slate-800/60" : "hover:bg-slate-800/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-slate-300">{opt.icon}</div>
                      <span className={`text-sm ${isSelected ? "font-semibold text-white" : "text-slate-300"}`}>
                        {opt.label}
                      </span>
                    </div>
                    <div>{isSelected ? <Check className="w-4 h-4 text-purple-400" /> : null}</div>
                  </li>
                );
              })}
            </m.ul>
          )}
        </AnimatePresence>,
        document.body,
      )
    : null;

  return (
    <>
      <div
        ref={triggerRef}
        className="flex items-center gap-2 cursor-pointer select-none"
        role="button"
        tabIndex={0}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((s) => !s)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((s) => !s);
          }
        }}
      >
        <div className="appearance-none bg-slate-800/50 border border-slate-600/50 rounded-xl px-4 py-3 pr-3 flex items-center gap-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200">
          <Filter className="w-4 h-4 text-slate-300" />
          <div className="flex items-center gap-2">
            <span className="text-sm">{options.find((o) => o.key === sortBy)?.label}</span>
          </div>
          <ChevronDown className={`w-4 h-4 ml-2 transform transition-transform ${open ? "rotate-180" : "rotate-0"} text-slate-300`} />
        </div>
      </div>

      {portal}
    </>
  );
}
