import { useId } from "react";

export function HelpTip({ title = "Help", children }: { title?: string; children: React.ReactNode }) {
  const id = useId();
  return (
    <details className="help-tip">
      <summary aria-describedby={id}>?<span className="sr-only">{title}</span></summary>
      <div className="help-tip-popover" id={id}>
        {title ? <strong>{title}</strong> : null}
        <div className="muted">{children}</div>
      </div>
    </details>
  );
}
