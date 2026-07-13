import type {
  CSSProperties,
  ReactNode
} from "react";

type PremiumCardProps = {
  children: ReactNode;
  className?: string;
  glow?: boolean;
  padding?: "small" | "medium" | "large";
};

export function PremiumCard({
  children,
  className = "",
  glow = false,
  padding = "medium"
}: PremiumCardProps) {
  return (
    <section
      className={[
        "cp-premium-card",
        `cp-card-padding-${padding}`,
        glow ? "cp-premium-card-glow" : "",
        className
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </section>
  );
}

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  action
}: SectionHeaderProps) {
  return (
    <div className="cp-section-header">
      <div className="cp-section-heading">
        {eyebrow ? (
          <span className="cp-eyebrow">
            {eyebrow}
          </span>
        ) : null}

        <h2>{title}</h2>

        {description ? (
          <p>{description}</p>
        ) : null}
      </div>

      {action ? (
        <div className="cp-section-action">
          {action}
        </div>
      ) : null}
    </div>
  );
}

type MetricCardProps = {
  label: string;
  value: string | number;
  note?: string;
  icon?: ReactNode;
  trend?: string;
  tone?:
    | "gold"
    | "green"
    | "blue"
    | "red"
    | "neutral";
};

export function MetricCard({
  label,
  value,
  note,
  icon,
  trend,
  tone = "gold"
}: MetricCardProps) {
  return (
    <article
      className={`cp-metric-card cp-tone-${tone}`}
    >
      <div className="cp-metric-card-top">
        <span className="cp-metric-icon">
          {icon}
        </span>

        {trend ? (
          <span className="cp-metric-trend">
            {trend}
          </span>
        ) : null}
      </div>

      <div className="cp-metric-content">
        <span className="cp-metric-label">
          {label}
        </span>

        <strong className="cp-metric-value">
          {value}
        </strong>

        {note ? (
          <small>{note}</small>
        ) : null}
      </div>
    </article>
  );
}

type StatusBadgeProps = {
  children: ReactNode;
  tone?:
    | "gold"
    | "green"
    | "blue"
    | "red"
    | "gray";
};

export function StatusBadge({
  children,
  tone = "gold"
}: StatusBadgeProps) {
  return (
    <span
      className={`cp-status-badge cp-status-${tone}`}
    >
      {children}
    </span>
  );
}

type ProgressMeterProps = {
  value: number;
  label?: string;
  helper?: string;
};

export function ProgressMeter({
  value,
  label,
  helper
}: ProgressMeterProps) {
  const safeValue = Math.max(
    0,
    Math.min(100, value)
  );

  return (
    <div className="cp-progress-wrap">
      <div className="cp-progress-label-row">
        <span>{label || "Progress"}</span>
        <strong>{safeValue}%</strong>
      </div>

      <div className="cp-progress-track">
        <div
          className="cp-progress-bar"
          style={
            {
              "--cp-progress-value":
                `${safeValue}%`
            } as CSSProperties
          }
        />
      </div>

      {helper ? (
        <small>{helper}</small>
      ) : null}
    </div>
  );
}

type InsightListProps = {
  title: string;
  items: string[];
  tone?: "positive" | "warning" | "danger";
  emptyText?: string;
};

export function InsightList({
  title,
  items,
  tone = "positive",
  emptyText = "No insights available."
}: InsightListProps) {
  return (
    <div
      className={`cp-insight-list cp-insight-${tone}`}
    >
      <h3>{title}</h3>

      {items.length === 0 ? (
        <p className="cp-insight-empty">
          {emptyText}
        </p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item}>
              <span className="cp-insight-dot" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type PremiumButtonProps = {
  children: ReactNode;
  type?: "button" | "submit";
  variant?: "gold" | "dark" | "soft" | "danger";
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
};

export function PremiumButton({
  children,
  type = "button",
  variant = "gold",
  disabled = false,
  onClick,
  className = ""
}: PremiumButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={[
        "cp-premium-button",
        `cp-button-${variant}`,
        className
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </button>
  );
}

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
};

export function PremiumEmptyState({
  title,
  description,
  icon,
  action
}: EmptyStateProps) {
  return (
    <div className="cp-empty-state">
      {icon ? (
        <div className="cp-empty-icon">
          {icon}
        </div>
      ) : null}

      <h3>{title}</h3>
      <p>{description}</p>

      {action ? (
        <div className="cp-empty-action">
          {action}
        </div>
      ) : null}
    </div>
  );
}