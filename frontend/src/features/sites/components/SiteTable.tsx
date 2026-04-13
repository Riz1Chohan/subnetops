import type { Site } from "../../../lib/types";

interface SiteTableProps {
  sites: Site[];
  onEdit?: (site: Site) => void;
  onDelete?: (site: Site) => void;
  deletingSiteId?: string | null;
}

export function SiteTable({ sites, onEdit, onDelete, deletingSiteId }: SiteTableProps) {
  if (sites.length === 0) return <p>No sites added yet.</p>;

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th align="left">Name</th>
          <th align="left">Location</th>
          <th align="left">Code</th>
          <th align="left">Address Block</th>
          <th align="left">Actions</th>
        </tr>
      </thead>
      <tbody>
        {sites.map((site) => (
          <tr key={site.id}>
            <td>{site.name}</td>
            <td>{site.location || "—"}</td>
            <td>{site.siteCode || "—"}</td>
            <td>{site.defaultAddressBlock || "—"}</td>
            <td style={{ display: "flex", gap: 8 }}>
              {onEdit ? <button type="button" onClick={() => onEdit(site)}>Edit</button> : null}
              {onDelete ? (
                <button type="button" onClick={() => onDelete(site)} disabled={deletingSiteId === site.id}>
                  {deletingSiteId === site.id ? "Deleting..." : "Delete"}
                </button>
              ) : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
