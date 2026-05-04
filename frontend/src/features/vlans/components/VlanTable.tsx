import { EmptyState } from "../../../components/app/EmptyState";
import type { Vlan } from "../../../lib/types";

interface VlanTableProps {
  vlans: Vlan[];
  onEdit?: (vlan: Vlan) => void;
  onDelete?: (vlan: Vlan) => void;
  deletingVlanId?: string | null;
  emptyTitle?: string;
  emptyMessage?: string;
}

/**
 * Stored-input table only.
 *
 * Authoritative subnet facts are displayed from the backend design-core snapshot
 * in the addressing/report views. This CRUD table does not calculate masks,
 * usable hosts, headroom, canonical CIDRs, or role classifications.
 */
export function VlanTable({
  vlans,
  onEdit,
  onDelete,
  deletingVlanId,
  emptyTitle = "No VLANs added yet",
  emptyMessage = "Add VLAN inputs, then review validation and addressing facts in the design views.",
}: VlanTableProps) {
  if (vlans.length === 0) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />;
  }

  return (
    <div className="data-table">
      <table>
        <thead>
          <tr>
            <th align="left">Site</th>
            <th align="left">VLAN ID</th>
            <th align="left">Name</th>
            <th align="left">Purpose</th>
            <th align="left">Explicit role</th>
            <th align="left">Subnet input</th>
            <th align="left">Gateway input</th>
            <th align="left">Estimated hosts</th>
            <th align="left">Backend authority</th>
            <th align="left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {vlans.map((vlan) => (
            <tr key={vlan.id}>
              <td>{vlan.site?.name || "—"}</td>
              <td>{vlan.vlanId}</td>
              <td>{vlan.vlanName}</td>
              <td>{vlan.purpose || "—"}</td>
              <td>{vlan.segmentRole || "—"}</td>
              <td>{vlan.subnetCidr}</td>
              <td>{vlan.gatewayIp}</td>
              <td>{vlan.estimatedHosts ?? "—"}</td>
              <td>Validated by backend design-core after save</td>
              <td>
                <div className="table-actions">
                  {onEdit ? <button type="button" onClick={() => onEdit(vlan)}>Edit</button> : null}
                  {onDelete ? (
                    <button type="button" onClick={() => onDelete(vlan)} disabled={deletingVlanId === vlan.id}>
                      {deletingVlanId === vlan.id ? "Deleting..." : "Delete"}
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
