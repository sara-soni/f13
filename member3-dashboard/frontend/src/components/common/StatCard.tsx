import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  detail: string;
  icon: ReactNode;
  tone: "amber" | "violet" | "green" | "blue" | "slate";
  subDetail?: string;
}

export default function StatCard({
  label,
  value,
  unit,
  detail,
  icon,
  tone,
  subDetail,
}: StatCardProps) {
  return (
    <article className="lf-stat-card" tabIndex={0} aria-label={`${label}: ${value} ${unit || ""}`}>
      <div className="lf-stat-top">
        <span>{label}</span>
        <div className={`lf-stat-icon ${tone}`}>{icon}</div>
      </div>
      <div className="lf-stat-value">
        {value}
        {unit && <small style={{ fontSize: "14px", fontWeight: 600, marginLeft: "4px" }}>{unit}</small>}
      </div>
      <div className="lf-stat-detail">{detail}</div>
      {subDetail && <div className="lf-stat-subdetail">{subDetail}</div>}
      <div className={`lf-stat-line ${tone}`} />
    </article>
  );
}
