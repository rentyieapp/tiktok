import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import type { WinCondition } from '@shared/types';
import { WIN_CONDITION_LABELS } from '@shared/defaults';

export function RangeField({
  label,
  hint,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  format,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
  format?: (value: number) => string;
}) {
  const display = format ? format(value) : `${value}${unit ? ` ${unit}` : ''}`;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label className="text-[13px] font-medium text-ink-800">{label}</label>
        <span className="rounded-md bg-ink-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-ink-700">
          {display}
        </span>
      </div>
      {hint ? <p className="mt-1 text-[11px] leading-relaxed text-ink-500">{hint}</p> : null}
      <div className="mt-2 flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-ink-200 accent-brand-500"
          aria-label={label}
        />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isFinite(next)) onChange(Math.min(max, Math.max(min, next)));
          }}
          className="w-20 shrink-0 rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-right text-xs font-medium text-ink-800 outline-none focus:border-brand-500"
          aria-label={`${label} değeri`}
        />
      </div>
    </div>
  );
}

export function SettingsGroup({
  title,
  description,
  icon,
  children,
  footer,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card sm:p-6">
      <div className="flex items-start gap-3">
        {icon ? (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink-100 text-ink-600">
            {icon}
          </span>
        ) : null}
        <div>
          <h2 className="text-[15px] font-semibold text-ink-900">{title}</h2>
          {description ? <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{description}</p> : null}
        </div>
      </div>
      <div className="mt-5 space-y-5">{children}</div>
      {footer ? <div className="mt-5 border-t border-ink-100 pt-4">{footer}</div> : null}
    </section>
  );
}

export function WinConditionPicker({
  value,
  onChange,
}: {
  value: WinCondition;
  onChange: (value: WinCondition) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {(Object.keys(WIN_CONDITION_LABELS) as WinCondition[]).map((condition) => {
        const active = condition === value;
        return (
          <button
            key={condition}
            type="button"
            onClick={() => onChange(condition)}
            className={`relative rounded-xl border p-3 text-left transition ${
              active
                ? 'border-brand-500 bg-brand-50/50 ring-1 ring-brand-500'
                : 'border-ink-200 bg-white hover:border-ink-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-semibold text-ink-900">{WIN_CONDITION_LABELS[condition].title}</p>
              {active ? (
                <span className="grid h-4 w-4 place-items-center rounded-full bg-brand-500 text-white">
                  <Check size={10} strokeWidth={3} />
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-ink-500">
              {WIN_CONDITION_LABELS[condition].description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
