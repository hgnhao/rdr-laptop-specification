"use client";

import { Moon, Sun } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useSyncExternalStore } from "react";
import { springFast } from "@/lib/motion";
import { setTheme, useTheme } from "@/lib/theme";

const noopSubscribe = () => () => {};

export function ThemeToggle() {
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const theme = useTheme();
  const label = theme === "dark" ? "Ganti ke mode terang" : "Ganti ke mode gelap";

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label={label}
      title={label}
      className="pressable grid size-7 shrink-0 place-items-center rounded-full text-label hover:text-link"
    >
      {/* Ikon baru dirender setelah hidrasi agar tema tersimpan tidak memicu animasi saat memuat. */}
      {hydrated && (
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={theme}
            initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
            transition={springFast}
            className="grid place-items-center"
          >
            {theme === "dark" ? <Sun size={16} strokeWidth={2} /> : <Moon size={15} strokeWidth={2} />}
          </motion.span>
        </AnimatePresence>
      )}
    </button>
  );
}
