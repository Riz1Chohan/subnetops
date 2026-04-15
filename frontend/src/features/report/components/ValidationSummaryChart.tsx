interface ValidationSummaryChartProps {
  errors: number;
  warnings: number;
  info: number;
}

export function ValidationSummaryChart({ errors, warnings, info }: ValidationSummaryChartProps) {
  const total = Math.max(errors + warnings + info, 1);
  const items = [
    { label: "Errors", value: errors, color: "#d9534f" },
    { label: "Warnings", value: warnings, color: "#f0ad4e" },
    { label: "Info", value: info, color: "#5bc0de" },
  ];

  return (
    <div className="panel report-section">
      <h2>Validation Summary</h2>
      <div style={{ display: "grid", gap: 12 }}>
        {items.map((item) => {
          const width = `${(item.value / total) * 100}%`;
          return (
            <div key={item.label}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
              <div style={{ height: 12, borderRadius: 999, background: "#edf1f7", overflow: "hidden" }}>
                <div style={{ width, height: "100%", background: item.color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
