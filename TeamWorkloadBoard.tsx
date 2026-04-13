import type { Vlan } from "../../../lib/types";
import { utilizationForCidr } from "../../../lib/networkValidators";

interface VlanTableProps {
  vlans: Vlan[];
  onEdit?: (vlan: Vlan) => void;
  onDelete?: (vlan: Vlan) => void;
  deletingVlanId?: string | null;
}

export function VlanTable({ vlans, onEdit, onDelete, deletingVlanId }: VlanTableProps) {
  if (vlans.length === 0) return <p>No VLANs added yet.</p>;

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
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
            <td style={{ display: "flex", gap: 8 }}>
              {onEdit ? <button type="button" onClick={() => onEdit(vlan)}>Edit</button> : null}
              {onDelete ? (
                <button type="button" onClick={() => onDelete(vlan)} disabled={deletingVlanId === vlan.id}>
                  {deletingVlanId === vlan.id ? "Deleting..." : "Delete"}
                </button>
              ) : null}
            </td>
          </tr>
          );
        })}
      </tbody>
    </table>
  );
}
