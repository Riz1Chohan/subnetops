import { api } from "../../lib/api";
import type { Vlan } from "../../lib/types";

export function createVlan(input: {
  siteId: string;
  vlanId: number;
  vlanName: string;
  purpose?: string;
  subnetCidr: string;
  gatewayIp: string;
  dhcpEnabled: boolean;
  estimatedHosts?: number;
  department?: string;
  notes?: string;
}) {
  return api<Vlan>("/vlans", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateVlan(vlanId: string, input: {
  vlanId?: number;
  vlanName?: string;
  purpose?: string;
  subnetCidr?: string;
  gatewayIp?: string;
  dhcpEnabled?: boolean;
  estimatedHosts?: number;
  department?: string;
  notes?: string;
}) {
  return api<Vlan>(`/vlans/${vlanId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteVlan(vlanId: string) {
  return api<void>(`/vlans/${vlanId}`, {
    method: "DELETE",
  });
}
