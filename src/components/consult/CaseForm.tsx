"use client";

import type { ReactNode } from "react";
import { Slider } from "@/components/ui/Slider";
import { formatValue, NUMERIC_ATTRIBUTES, RAM_OPTIONS } from "@/lib/rdr/attributes";
import { PERSONAS } from "@/lib/rdr/presets";
import type { Case, NumericAttribute } from "@/lib/rdr/types";

interface Props {
  value: Case;
  onChange: (c: Case) => void;
}

/** Judul dua warna khas Apple Store: "Memori. Berapa RAM yang dibutuhkan?" */
function Section({ title, question, children }: { title: string; question: string; children: ReactNode }) {
  return (
    <section className="mt-14 first:mt-0">
      <h2 className="type-section text-balance">
        {title}. <span className="text-label-3">{question}</span>
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Tiles<T extends string | number>({
  label,
  value,
  options,
  onChange,
  cols,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  cols: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={`grid gap-3 ${cols}`}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className="tile pressable min-h-16 px-4 py-3 text-left text-[1.0625rem] font-semibold"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function NumberField({ attr, label, value, onChange }: { attr: Exclude<NumericAttribute, "ram_gb">; label: string; value: number; onChange: (v: number) => void }) {
  const meta = NUMERIC_ATTRIBUTES[attr];
  return (
    <Slider
      id={`slider-${attr}`}
      label={label}
      value={value}
      min={meta.min}
      max={meta.max}
      step={meta.step}
      display={formatValue(attr, value)}
      minLabel={formatValue(attr, meta.min)}
      maxLabel={formatValue(attr, meta.max)}
      onChange={(v) => onChange(Number(v.toFixed(2)))}
    />
  );
}

export function CaseForm({ value, onChange }: Props) {
  const set = <K extends keyof Case>(key: K, v: Case[K]) => onChange({ ...value, [key]: v });

  return (
    <div>
      <p className="type-small flex flex-wrap gap-x-4 gap-y-1 text-label-2">
        <span>Isi cepat:</span>
        {PERSONAS.map((p) => (
          <button key={p.id} type="button" onClick={() => onChange({ ...p.case })} className="text-link hover:underline">
            {p.label}
          </button>
        ))}
      </p>

      <div className="mt-10">
        <Section title="Penggunaan" question="Untuk apa laptopnya?">
          <Tiles
            label="Penggunaan"
            value={value.primary_usage}
            onChange={(v) => set("primary_usage", v)}
            cols="grid-cols-2"
            options={[
              { value: "office", label: "Office" },
              { value: "gaming", label: "Gaming" },
              { value: "video_editing", label: "Video editing" },
              { value: "ai_training", label: "AI training" },
            ]}
          />
        </Section>

        <Section title="Budget" question="Berapa maksimal?">
          <NumberField attr="budget" label="Budget" value={value.budget} onChange={(v) => set("budget", v)} />
        </Section>

        <Section title="Memori" question="Berapa RAM yang dibutuhkan?">
          <Tiles
            label="RAM"
            value={value.ram_gb}
            onChange={(v) => set("ram_gb", v)}
            cols="grid-cols-3 sm:grid-cols-5"
            options={RAM_OPTIONS.map((r) => ({ value: r, label: `${r} GB` }))}
          />
        </Section>

        <Section title="Grafis" question="Perlu GPU dedicated?">
          <Tiles
            label="GPU dedicated"
            value={value.gpu_required}
            onChange={(v) => set("gpu_required", v)}
            cols="grid-cols-2"
            options={[
              { value: "yes", label: "Perlu" },
              { value: "no", label: "Tidak perlu" },
            ]}
          />
        </Section>

        <Section title="Layar" question="Pilih jenis panel.">
          <Tiles
            label="Layar"
            value={value.screen_type}
            onChange={(v) => set("screen_type", v)}
            cols="grid-cols-3"
            options={[
              { value: "oled", label: "OLED" },
              { value: "ips", label: "IPS" },
              { value: "tn", label: "TN" },
            ]}
          />
        </Section>

        <Section title="Bobot" question="Seberapa ringan?">
          <NumberField attr="weight_kg" label="Bobot" value={value.weight_kg} onChange={(v) => set("weight_kg", v)} />
        </Section>

        <Section title="Baterai" question="Tahan berapa lama?">
          <NumberField attr="battery_hours" label="Baterai" value={value.battery_hours} onChange={(v) => set("battery_hours", v)} />
        </Section>
      </div>
    </div>
  );
}
