"use client";
import Link from "next/link";
import {
  ArrowRight,
  Hexagon,
  LoaderCircle,
  AlertCircle,
  BookOpen,
} from "lucide-react";
import type { ReactNode } from "react";
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="qb-brand" aria-label="QuizBee home">
      <span className="qb-mark">
        <Hexagon size={27} strokeWidth={1.7} />
        <span />
      </span>
      {!compact && (
        <span>
          QuizBee<span className="qb-brand-dot">.</span>
        </span>
      )}
    </Link>
  );
}
export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "quiet" | "danger";
}) {
  return (
    <button
      className={`qb-button qb-button-${variant} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
export function ActionLink({
  href,
  children,
  secondary = false,
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link
      className={`qb-button qb-button-${secondary ? "secondary" : "primary"}`}
      href={href}
    >
      {children}
    </Link>
  );
}
export function PageTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="qb-page-title">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="qb-page-actions">{action}</div>}
    </header>
  );
}
export function ErrorMessage({
  children,
  retry,
}: {
  children?: ReactNode;
  retry?: () => void;
}) {
  if (!children) return null;
  return (
    <div className="qb-notice qb-notice-error" role="alert">
      <AlertCircle size={18} />
      <div>
        {children}
        {retry && (
          <button className="qb-text-link" onClick={retry}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="qb-notice" role="status">
      {children}
    </div>
  );
}
export function Loading({
  label = "Opening your workspace…",
}: {
  label?: string;
}) {
  return (
    <div className="qb-loading" role="status">
      <LoaderCircle size={22} className="qb-spin" />
      <span>{label}</span>
    </div>
  );
}
export function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="qb-empty">
      <BookOpen size={32} strokeWidth={1.3} />
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function Field({
  label,
  children,
  hint,
  className = "",
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={`qb-field ${className}`}>
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Tag({
  children,
  tone = "",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return (
    <span className={`qb-tag ${tone ? `qb-tag-${tone}` : ""}`}>{children}</span>
  );
}
export function SectionHeading({
  title,
  href,
  linkLabel = "View all",
}: {
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="qb-section-heading">
      <h2>{title}</h2>
      {href && (
        <Link href={href}>
          {linkLabel}
          <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}
