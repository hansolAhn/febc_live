export function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="metric-card">
      <div className="muted">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="muted">{detail}</div>
    </div>
  );
}
