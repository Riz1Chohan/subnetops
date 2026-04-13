import { useEffect, useMemo, useState } from "react";
import { isValidCidr, isValidIpv4, planningHintForHosts, suggestSubnetWithinBlock, utilizationForCidr } from "../../../lib/networkValidators";
import type { Site, Vlan } from "../../../lib/types";

interface VlanFormProps {
  sites: Site[];
  existingVlans?: Vlan[];
  initialValues?: Partial<Vlan> | null;
  submitLabel?: string;
  onCancel?: () => void;
  onSubmit: (values: {
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
  }) => void | Promise<void>;
  isSubmitting?: boolean;
}

export function VlanForm({
  sites,
  existingVlans = [],
  initialValues,
  submitLabel = "Create VLAN",
  onCancel,
  onSubmit,
  isSubmitting,
}: VlanFormProps) {
  const defaultSiteId = useMemo(() => initialValues?.siteId || sites[0]?.id || "", [initialValues?.siteId, sites]);
  const [siteId, setSiteId] = useState(defaultSiteId);
  const [vlanId, setVlanId] = useState("10");
  const [vlanName, setVlanName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [subnetCidr, setSubnetCidr] = useState("");
  const [gatewayIp, setGatewayIp] = useState("");
  const [estimatedHosts, setEstimatedHosts] = useState("");
  const [department, setDepartment] = useState("");
  const [notes, setNotes] = useState("");
  const [dhcpEnabled, setDhcpEnabled] = useState(true);

  useEffect(() => {
    setSiteId(initialValues?.siteId || sites[0]?.id || "");
    setVlanId(initialValues?.vlanId ? String(initialValues.vlanId) : "10");
    setVlanName(initialValues?.vlanName ?? "");
    setPurpose(initialValues?.purpose ?? "");
    setSubnetCidr(initialValues?.subnetCidr ?? "");
    setGatewayIp(initialValues?.gatewayIp ?? "");
    setEstimatedHosts(initialValues?.estimatedHosts !== undefined ? String(initialValues.estimatedHosts) : "");
    setDepartment(initialValues?.department ?? "");
    setNotes(initialValues?.notes ?? "");
    setDhcpEnabled(initialValues?.dhcpEnabled ?? true);
  }, [initialValues, sites]);

  const planningHint = useMemo(() => planningHintForHosts(estimatedHosts ? Number(estimatedHosts) : undefined), [estimatedHosts]);
  const currentUtilization = useMemo(() => utilizationForCidr(subnetCidr, estimatedHosts ? Number(estimatedHosts) : undefined), [subnetCidr, estimatedHosts]);
  const selectedSite = useMemo(() => sites.find((site) => site.id === siteId), [sites, siteId]);
  const subnetSuggestion = useMemo(() => suggestSubnetWithinBlock(selectedSite?.defaultAddressBlock, existingVlans.filter((vlan) => vlan.siteId === siteId && vlan.id !== initialValues?.id).map((vlan) => vlan.subnetCidr), estimatedHosts ? Number(estimatedHosts) : undefined), [selectedSite?.defaultAddressBlock, existingVlans, siteId, estimatedHosts, initialValues?.id]);

  const error = useMemo(() => {
    const vlanNumber = Number(vlanId);
    if (!siteId) return "Select a site first.";
    if (!Number.isInteger(vlanNumber) || vlanNumber < 1 || vlanNumber > 4094) return "VLAN ID must be between 1 and 4094.";
    if (!vlanName.trim()) return "VLAN name is required.";
    if (!isValidCidr(subnetCidr)) return "Subnet must be valid CIDR format.";
    if (!isValidIpv4(gatewayIp)) return "Gateway must be a valid IPv4 address.";
    if (estimatedHosts && (!/^\d+$/.test(estimatedHosts) || Number(estimatedHosts) < 0)) return "Estimated hosts must be a non-negative number.";
    return "";
  }, [siteId, vlanId, vlanName, subnetCidr, gatewayIp, estimatedHosts]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (error) return;
        void onSubmit({
          siteId,
          vlanId: Number(vlanId),
          vlanName: vlanName.trim(),
          purpose,
          subnetCidr,
          gatewayIp,
          dhcpEnabled,
          estimatedHosts: estimatedHosts ? Number(estimatedHosts) : undefined,
          department,
          notes,
        });
      }}
      className="panel"
    >
      <h3 style={{ margin: 0 }}>{initialValues?.id ? "Edit VLAN" : "Add VLAN"}</h3>
      <select value={siteId} onChange={(e) => setSiteId(e.target.value)} required>
        {sites.map((site) => (
          <option key={site.id} value={site.id}>{site.name}</option>
        ))}
      </select>
      <input placeholder="VLAN ID" value={vlanId} onChange={(e) => setVlanId(e.target.value)} required />
      <input placeholder="VLAN Name" value={vlanName} onChange={(e) => setVlanName(e.target.value)} required />
      <input placeholder="Purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
      <input placeholder="Subnet CIDR" value={subnetCidr} onChange={(e) => setSubnetCidr(e.target.value)} required />
      <input placeholder="Gateway IP" value={gatewayIp} onChange={(e) => setGatewayIp(e.target.value)} required />
      <input placeholder="Estimated hosts" value={estimatedHosts} onChange={(e) => setEstimatedHosts(e.target.value)} />
      {planningHint ? (
        <div className="validation-card">
          <strong>Planning hint</strong>
          <p className="muted" style={{ margin: "6px 0" }}>Recommended minimum size: <strong>/{planningHint.recommendedPrefix}</strong> with about <strong>{planningHint.usableHosts}</strong> usable hosts. Suggested reserve buffer: <strong>{planningHint.reserveBuffer}</strong>.</p>
          {currentUtilization ? <p className="muted" style={{ margin: 0 }}>Current subnet headroom: <strong>{currentUtilization.headroom}</strong> • utilization: <strong>{Math.round(currentUtilization.utilization * 100)}%</strong></p> : null}
          {selectedSite?.defaultAddressBlock ? (
            subnetSuggestion ? (
              <div style={{ marginTop: 8 }}>
                <p className="muted" style={{ margin: "6px 0" }}>Suggested placement inside site block <strong>{selectedSite.defaultAddressBlock}</strong>: <strong>{subnetSuggestion.subnetCidr}</strong> with gateway <strong>{subnetSuggestion.gatewayIp}</strong>.</p>
                <button type="button" onClick={() => { setSubnetCidr(subnetSuggestion.subnetCidr); setGatewayIp(subnetSuggestion.gatewayIp); }}>Use Suggested Subnet</button>
              </div>
            ) : <p className="muted" style={{ marginTop: 8 }}>No fitting subnet suggestion was found inside <strong>{selectedSite.defaultAddressBlock}</strong> for the current host estimate.</p>
          ) : null}
        </div>
      ) : null}
      <input placeholder="Department" value={department} onChange={(e) => setDepartment(e.target.value)} />
      <textarea placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      <label>
        <input type="checkbox" checked={dhcpEnabled} onChange={(e) => setDhcpEnabled(e.target.checked)} /> DHCP enabled
      </label>
      {error ? <p className="error-text">{error}</p> : null}
      <div className="form-actions">
        <button type="submit" disabled={isSubmitting || Boolean(error) || sites.length === 0}>{isSubmitting ? "Saving..." : submitLabel}</button>
        {onCancel ? <button type="button" onClick={onCancel}>Cancel</button> : null}
      </div>
    </form>
  );
}
