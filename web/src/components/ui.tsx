import {
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, Loader2, X } from 'lucide-react';
import { initials } from '../lib/format';

/* ------------------------------------------------------------------ */
/* Button                                                              */
/* ------------------------------------------------------------------ */

type ButtonVariant = 'primary' | 'brand' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  brand: 'btn-brand',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`${VARIANT_CLASS[variant]} ${SIZE_CLASS[size]} ${className}`}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Form alanları                                                       */
/* ------------------------------------------------------------------ */

interface FieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
  action?: ReactNode;
}

export function Field({ label, hint, error, children, className = '', htmlFor, action }: FieldProps) {
  return (
    <div className={className}>
      {label || action ? (
        <div className="mb-1.5 flex items-center justify-between gap-3">
          {label ? (
            <label className="text-[13px] font-medium text-ink-700" htmlFor={htmlFor}>
              {label}
            </label>
          ) : (
            <span />
          )}
          {action}
        </div>
      ) : null}
      {children}
      {error ? <p className="field-error">{error}</p> : hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props;
  return <input {...rest} className={`input ${className}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = '', ...rest } = props;
  return <textarea {...rest} className={`textarea ${className}`} />;
}

interface ToggleProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, description, disabled }: ToggleProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      {label ? (
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-800">{label}</p>
          {description ? <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{description}</p> : null}
        </div>
      ) : null}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label ?? 'Aç/Kapat'}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:opacity-50 ${
          checked ? 'bg-brand-500' : 'bg-ink-200'
        }`}
      >
        <span
          className={`inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-[23px]' : 'translate-x-[3px]'
          }`}
        />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Kartlar                                                             */
/* ------------------------------------------------------------------ */

export function SectionCard({
  title,
  description,
  icon,
  action,
  children,
  className = '',
  bodyClassName = 'card-pad',
}: {
  title?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {title || action ? (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-100 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            {icon ? <span className="mt-0.5 text-ink-400">{icon}</span> : null}
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold text-ink-900">{title}</h2>
              {description ? (
                <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{description}</p>
              ) : null}
            </div>
          </div>
          {action}
        </header>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-2xl font-bold tracking-tight text-ink-950 sm:text-[28px]">{title}</h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-500">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = 'brand',
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  accent?: 'brand' | 'ink' | 'amber' | 'violet';
}) {
  const accents: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-600',
    ink: 'bg-ink-100 text-ink-600',
    amber: 'bg-amber-50 text-amber-600',
    violet: 'bg-violet-50 text-violet-600',
  };
  return (
    <div className="card card-pad">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-ink-500">{label}</p>
          <p className="mt-2 truncate font-display text-[26px] font-bold leading-none text-ink-950">
            {value}
          </p>
          {hint ? <p className="mt-2 text-[11px] leading-relaxed text-ink-400">{hint}</p> : null}
        </div>
        {icon ? (
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${accents[accent]}`}>
            {icon}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Rozetler                                                            */
/* ------------------------------------------------------------------ */

export function StatusBadge({ status, children }: { status: 'ok' | 'warn' | 'bad' | 'neutral'; children: ReactNode }) {
  const classes: Record<string, string> = {
    ok: 'badge-ok',
    warn: 'badge-warn',
    bad: 'badge bg-red-50 text-red-600 ring-1 ring-inset ring-red-200',
    neutral: 'badge-neutral',
  };
  return (
    <span className={classes[status]}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === 'ok'
            ? 'bg-brand-500'
            : status === 'warn'
              ? 'bg-amber-500'
              : status === 'bad'
                ? 'bg-red-500'
                : 'bg-ink-400'
        }`}
      />
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Takım arması                                                        */
/* ------------------------------------------------------------------ */

export function TeamCrest({
  symbol,
  emblemUrl,
  color,
  size = 40,
  className = '',
  ring = true,
}: {
  symbol: string;
  emblemUrl?: string | null;
  color: string;
  size?: number;
  className?: string;
  ring?: boolean;
}) {
  return (
    <span
      className={`inline-grid shrink-0 place-items-center overflow-hidden rounded-xl ${
        ring ? 'ring-1 ring-inset ring-black/10' : ''
      } ${className}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(140deg, ${color}2e, ${color}12)`,
        fontSize: Math.round(size * 0.5),
        lineHeight: 1,
      }}
    >
      {emblemUrl ? (
        <img src={emblemUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span aria-hidden>{symbol || '⭐'}</span>
      )}
    </span>
  );
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-full bg-ink-900 font-semibold text-white"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.34) }}
    >
      {initials(name)}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* İlerleme çubuğu                                                     */
/* ------------------------------------------------------------------ */

export function ProgressBar({
  value,
  color = '#10b981',
  trackClassName = 'bg-ink-100',
  height = 8,
}: {
  value: number;
  color?: string;
  trackClassName?: string;
  height?: number;
}) {
  return (
    <div
      className={`w-full overflow-hidden rounded-full ${trackClassName}`}
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(Math.min(100, Math.max(0, value)))}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Boş durum                                                           */
/* ------------------------------------------------------------------ */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-12 text-center ${className}`}>
      {icon ? (
        <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-ink-100 text-ink-500">
          {icon}
        </span>
      ) : null}
      <h3 className="text-base font-semibold text-ink-900">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-500">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Modal                                                               */
/* ------------------------------------------------------------------ */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;
  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' };
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-ink-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Kapat"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-ink-100 bg-white shadow-float sm:rounded-2xl ${widths[size]} animate-fade-up`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-ink-100 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-base font-semibold text-ink-900">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
            aria-label="Pencereyi kapat"
          >
            <X size={18} />
          </button>
        </header>
        <div className="px-5 py-5 sm:px-6">{children}</div>
        {footer ? (
          <footer className="flex flex-wrap justify-end gap-2 border-t border-ink-100 bg-ink-50/50 px-5 py-4 sm:px-6">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */
/* Kopyala                                                             */
/* ------------------------------------------------------------------ */

export function CopyButton({
  value,
  label = 'Kopyala',
  size = 'md',
  variant = 'secondary',
  className = '',
}: {
  value: string;
  label?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };
  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      onClick={copy}
      icon={copied ? <Check size={15} /> : <Copy size={15} />}
      className={className}
    >
      {copied ? 'Kopyalandı' : label}
    </Button>
  );
}

export function Spinner({ label = 'Yükleniyor...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-sm text-ink-500">
      <Loader2 size={18} className="animate-spin text-brand-500" />
      {label}
    </div>
  );
}
