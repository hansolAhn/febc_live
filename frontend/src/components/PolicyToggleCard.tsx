"use client";

export function PolicyToggleCard({ title, description, enabled, onToggle }: { title: string; description: string; enabled: boolean; onToggle: () => void }) {
  return (
    <div className="panel policy-card">
      <div className="toggle-row">
        <div>
          <div className="panel-title">{title}</div>
          {description ? <div className="muted">{description}</div> : null}
        </div>
        <button aria-pressed={enabled} className={`toggle toggle-static ${enabled ? "on" : ""}`} onClick={onToggle} type="button" />
      </div>
    </div>
  );
}
