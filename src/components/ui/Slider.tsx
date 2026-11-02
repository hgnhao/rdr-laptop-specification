"use client";

import type { CSSProperties } from "react";

interface Props {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  minLabel: string;
  maxLabel: string;
  onChange: (value: number) => void;
}

/** Nilai ikut bergerak 1:1 dengan thumb selama digeser (DESIGN.md §1). */
export function Slider({ id, label, value, min, max, step, display, minLabel, maxLabel, onChange }: Props) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <output htmlFor={id} className="type-title block tabular-nums">
        {display}
      </output>
      <input
        id={id}
        type="range"
        aria-label={label}
        className="range mt-3"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ "--fill-pct": `${pct}%` } as CSSProperties}
      />
      <div className="type-caption mt-1 flex justify-between text-label-3">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}
