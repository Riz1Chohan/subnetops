import { EmptyState } from "../../../components/app/EmptyState";
import type { Site } from "../../../lib/types";

interface SiteTableProps {
  sites: Site[];
  onEdit?: (site: Site) => void;
  onDelete?: (site: Site) => void;
  deletingSiteId?: string | null;
}

export function SiteTable({ sites, onEdit, onDelete, deletingSiteId }: SiteTableProps) {
  if (sites.length === 0) {
    return (
      <EmptyState
        title="No sites added yet"
        message="Add your first site to start organizing address blocks, branches, or locations for this project."
      />
    );
  }

  return (
    <div className="data-table">
      <table>
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
              <td>
                <div className="table-actions">
                  {onEdit ? <button type="button" onClick={() => onEdit(site)}>Edit</button> : null}
                  {onDelete ? (
                    <button type="button" onClick={() => onDelete(site)} disabled={deletingSiteId === site.id}>
                      {deletingSiteId === site.id ? "Deleting..." : "Delete"}
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
