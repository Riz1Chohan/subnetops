import { EmptyState } from "../../../components/app/EmptyState";
import type { Vlan } from "../../../lib/types";
import { utilizationForCidr } from "../../../lib/networkValidators";

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
            <th align="left">Subnet</th>
            <th align="left">Gateway</th>
            <th align="left">DHCP</th>
            <th align="left">Headroom</th>
            <th align="left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {vlans.map((vlan) => {
            const utilization = utilizationForCidr(vlan.subnetCidr, vlan.estimatedHosts);
            return (
              <tr key={vlan.id}>
                <td>{vlan.site?.name || "—"}</td>
                <td>{vlan.vlanId}</td>
                <td>{vlan.vlanName}</td>
                <td>{vlan.subnetCidr}</td>
                <td>{vlan.gatewayIp}</td>
                <td>{vlan.dhcpEnabled ? "Yes" : "No"}</td>
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
