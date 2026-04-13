import { EmptyState } from "../../../components/app/EmptyState";
import type { Vlan } from "../../../lib/types";
import { classifySegmentRole, subnetFacts, utilizationForCidr } from "../../../lib/networkValidators";

interface VlanTableProps {
  vlans: Vlan[];
  onEdit?: (vlan: Vlan) => void;
  onDelete?: (vlan: Vlan) => void;
  deletingVlanId?: string | null;
  emptyTitle?: string;
  emptyMessage?: string;
}

export function VlanTable({
  vlans,
  onEdit,
  onDelete,
  deletingVlanId,
  emptyTitle = "No VLANs added yet",
  emptyMessage = "Add a VLAN to start planning subnets, gateways, and segment boundaries for this project.",
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
            <th align="left">Subnet</th>
            <th align="left">Gateway</th>
            <th align="left">Mask</th>
            <th align="left">Usable</th>
            <th align="left">Headroom</th>
            <th align="left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {vlans.map((vlan) => {
            const role = classifySegmentRole(`${vlan.purpose || ""} ${vlan.vlanName} ${vlan.department || ""}`);
            const facts = subnetFacts(vlan.subnetCidr, role);
            const utilization = utilizationForCidr(vlan.subnetCidr, vlan.estimatedHosts, role);
            return (
              <tr key={vlan.id}>
                <td>{vlan.site?.name || "—"}</td>
                <td>{vlan.vlanId}</td>
                <td>{vlan.vlanName}</td>
                <td>{vlan.purpose || role.replaceAll("_", " ")}</td>
                <td>{facts?.canonicalCidr || vlan.subnetCidr}</td>
                <td>{vlan.gatewayIp}</td>
                <td>{facts?.dottedMask || "—"}</td>
                <td>{facts ? facts.usableAddresses : "—"}</td>
                <td>{utilization ? `${utilization.headroom} free (${Math.round(utilization.utilization * 100)}% used)` : "—"}</td>
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
