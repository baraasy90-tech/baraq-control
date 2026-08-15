import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";
import type { LucideIcon } from "lucide-react";

export function AuthCard({ children, title, eyebrow }: { children: ReactNode; title: string; eyebrow: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-5">
      <div className="bg-panel border border-line/60 shadow-sm rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-5 pb-5 border-b border-line/60">
          <div className="text-sm font-bold tracking-[0.2em] text-primary">BARAQ CONTROL</div>
          <div className="text-[11px] text-ink-soft mt-1">منصة إدارة المشاريع المتكاملة</div>
        </div>
        <div className="text-xs text-ink-soft tracking-wide font-mono">{eyebrow}</div>
        <h1 className="text-xl font-bold text-ink mt-1 mb-6">{title}</h1>
        {children}
      </div>
    </div>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="block text-sm font-semibold text-ink-soft mb-1.5">{children}</label>;
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        "w-full px-3 py-2.5 border border-line rounded-lg text-sm font-sans box-border focus:outline-none focus:ring-2 focus:ring-primary/40",
        props.className
      )}
    />
  );
}

export function PrimaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={clsx(
        "w-full py-3 bg-ink text-white border-none rounded-lg font-bold text-sm cursor-pointer shadow-sm transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:opacity-40",
        props.className
      )}
    />
  );
}

export function SecondaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={clsx(
        "py-2.5 px-4 bg-panel text-ink border border-line/70 rounded-lg font-semibold text-sm cursor-pointer transition hover:bg-bg disabled:opacity-40",
        props.className
      )}
    />
  );
}

export function IconButton({
  icon: Icon,
  label,
  tone = "default",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string; tone?: "default" | "critical" }) {
  return (
    <button
      {...props}
      title={label}
      aria-label={label}
      className={clsx(
        "inline-flex items-center justify-center w-8 h-8 rounded-lg border border-line/70 bg-panel cursor-pointer transition hover:bg-bg disabled:opacity-30 disabled:cursor-not-allowed",
        tone === "critical" ? "text-critical hover:bg-critical-bg border-critical/30" : "text-ink-soft hover:text-ink",
        props.className
      )}
    >
      <Icon size={15} strokeWidth={2} />
    </button>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p className="text-sm text-critical mt-2">{children}</p>;
}

export function Card({ children, title, className }: { children: ReactNode; title?: string; className?: string }) {
  return (
    <div className={clsx("bg-panel border border-line/60 shadow-sm rounded-xl p-5", className)}>
      {title && <h3 className="text-sm font-bold text-ink mb-3">{title}</h3>}
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "warn" | "critical";
}) {
  return (
    <div className="bg-panel border border-line/60 shadow-sm rounded-xl p-4">
      <div className="text-xs text-ink-soft font-semibold mb-1.5">{label}</div>
      <div className={clsx("text-base font-bold", tone === "warn" ? "text-warn" : tone === "critical" ? "text-critical" : "text-ink")}>
        {value ?? "—"}
      </div>
      {sub && <div className="text-xs text-ink-soft mt-1">{sub}</div>}
    </div>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 bg-navy/50 backdrop-blur-[2px] z-50 flex items-center justify-center p-3 sm:p-5">
      <div
        className="bg-panel border border-line/60 shadow-xl rounded-2xl w-full max-w-lg max-h-[calc(100vh-24px)] sm:max-h-[calc(100vh-40px)] flex flex-col"
      >
        <div className="flex items-center justify-between px-5 pt-5 sm:px-6 sm:pt-6 pb-4 shrink-0">
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          <button
            onClick={onClose}
            className="text-ink-soft hover:text-ink cursor-pointer bg-transparent border-none text-xl leading-none"
            aria-label="إغلاق"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-5 sm:px-6 sm:pb-6">{children}</div>
      </div>
    </div>
  );
}
