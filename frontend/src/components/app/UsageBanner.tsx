interface UsageBannerProps {
  planTier?: "FREE" | "PAID";
  projectCount?: number;
  siteCount?: number;
  vlanCount?: number;
}

export function UsageBanner({ planTier, projectCount = 0, siteCount, vlanCount }: UsageBannerProps) {
  if (planTier !== "FREE") {
    return null;
  }

  return (
    <div className="usage-banner">
      <div>
        <strong>Free plan</strong>
        <p className="muted" style={{ margin: 0 }}>
          Upgrade later for more projects, sites, and VLANs.
        </p>
      </div>
      <div className="usage-metrics">
        <span className="metric-pill">Projects: {projectCount}/2</span>
        {typeof siteCount === "number" ? <span className="metric-pill">Sites: {siteCount}/2</span> : null}
        {typeof vlanCount === "number" ? <span className="metric-pill">VLANs: {vlanCount}/15</span> : null}
      </div>
    </div>
  );
}
