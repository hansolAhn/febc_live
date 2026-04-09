import Link from "next/link";

export function StatCard({
  label,
  value,
  detail,
  href
}: {
  label: string;
  value: string;
  detail?: string;
  href?: string;
}) {
  return (
    <div className="metric-card">
      <div className="panel-header-inline metric-card-header">
        <div className="muted">{label}</div>
        {href ? (
          <Link className="metric-card-link" href={href} aria-label={`${label} 바로가기`} title={`${label} 바로가기`}>
            →
          </Link>
        ) : null}
      </div>
      <div className="metric-value">{value}</div>
      {detail ? <div className="muted">{detail}</div> : null}
    </div>
  );
}
