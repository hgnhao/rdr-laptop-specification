"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { springFast } from "@/lib/motion";

interface Option<T> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
}

interface Props<T extends string | number> {
  value: T;
  onChange: (value: T) => void;
  options: Option<T>[];
  id: string;
  ariaLabel: string;
  size?: "sm" | "md";
  className?: string;
}

export function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  id,
  ariaLabel,
  size = "md",
  className = "",
}: Props<T>) {
  const height = size === "sm" ? "h-8 text-[0.8125rem]" : "h-9 text-sm";
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`relative flex rounded-[0.6875rem] bg-fill p-0.5 ${className}`}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={`pressable relative flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[0.5625rem] px-3 font-medium whitespace-nowrap ${height} ${
              active ? "text-label" : "text-label-2 hover:text-label"
            }`}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                transition={springFast}
                className="absolute inset-0 rounded-[0.5625rem] bg-seg-thumb shadow-[0_3px_8px_rgba(0,0,0,0.12),0_3px_1px_rgba(0,0,0,0.04)]"
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {opt.icon}
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
