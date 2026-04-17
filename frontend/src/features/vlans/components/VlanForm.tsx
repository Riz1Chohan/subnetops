import { useEffect, useMemo, useState } from "react";
import {
  canonicalizeCidr,
  classifySegmentRole,
  isValidCidr,
  isValidIpv4,
  planningHintForHosts,
  subnetFacts,
  subnetWithinBlock,
  suggestSubnetWithinBlock,
  utilizationForCidr,
} from "../../../lib/networkValidators";
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

const PURPOSE_OPTIONS = [
  { value: "User Access", label: "User Access" },
  { value: "Guest", label: "Guest" },
  { value: "Servers", label: "Servers" },
  { value: "Management", label: "Management" },
  { value: "Voice", label: "Voice" },
  { value: "Printers", label: "Printers" },
  { value: "IoT / OT / Medical / Lab", label: "IoT / OT / Medical / Lab" },
  { value: "Cameras", label: "Cameras" },
  { value: "WAN Transit", label: "WAN Transit" },
  { value: "Loopback / Host Route", label: "Loopback / Host Route" },
  { value: "Other", label: "Other" },
];

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
  const [purpose, setPurpose] = useState("User Access");
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
    setPurpose(initialValues?.purpose ?? "User Access");
    setSubnetCidr(initialValues?.subnetCidr ?? "");
    setGatewayIp(initialValues?.gatewayIp ?? "");
    setEstimatedHosts(initialValues?.estimatedHosts !== undefined ? String(initialValues.estimatedHosts) : "");
    setDepartment(initialValues?.department ?? "");
    setNotes(initialValues?.notes ?? "");
    setDhcpEnabled(initialValues?.dhcpEnabled ?? true);
  }, [initialValues, sites]);

  const role = useMemo(() => classifySegmentRole(`${purpose} ${vlanName} ${department} ${notes}`), [purpose, vlanName, department, notes]);
  const planningHint = useMemo(() => planningHintForHosts(estimatedHosts ? Number(estimatedHosts) : undefined, role), [estimatedHosts, role]);
  const currentUtilization = useMemo(() => utilizationForCidr(subnetCidr, estimatedHosts ? Number(estimatedHosts) : undefined, role), [subnetCidr, estimatedHosts, role]);
  const selectedSite = useMemo(() => sites.find((site) => site.id === siteId), [sites, siteId]);
  const subnetSuggestion = useMemo(
    () => suggestSubnetWithinBlock(
      selectedSite?.defaultAddressBlock,
      existingVlans.filter((vlan) => vlan.siteId === siteId && vlan.id !== initialValues?.id).map((vlan) => vlan.subnetCidr),
      estimatedHosts ? Number(estimatedHosts) : undefined,
      role,
    ),
    [selectedSite?.defaultAddressBlock, existingVlans, siteId, estimatedHosts, initialValues?.id, role],
  );
  const facts = useMemo(() => subnetFacts(subnetCidr, role), [subnetCidr, role]);
  const insideParentBlock = useMemo(() => subnetWithinBlock(subnetCidr, selectedSite?.defaultAddressBlock), [subnetCidr, selectedSite?.defaultAddressBlock]);

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
      style={{ display: "grid", gap: 10 }}
    >
      <h3 style={{ margin: 0 }}>{initialValues?.id ? "Edit VLAN" : "Add VLAN"}</h3>
      <select value={siteId} onChange={(e) => setSiteId(e.target.value)} required>
        {sites.map((site) => (
          <option key={site.id} value={site.id}>{site.name}</option>
        ))}
      </select>
      <div className="grid-2">
        <input placeholder="VLAN ID" value={vlanId} onChange={(e) => setVlanId(e.target.value)} required />
        <input placeholder="VLAN Name" value={vlanName} onChange={(e) => setVlanName(e.target.value)} required />
      </div>
      <select value={purpose} onChange={(e) => setPurpose(e.target.value)}>
        {PURPOSE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <div className="grid-2">
        <input placeholder="Subnet CIDR" value={subnetCidr} onChange={(e) => setSubnetCidr(e.target.value)} required />
        <input placeholder="Gateway IP" value={gatewayIp} onChange={(e) => setGatewayIp(e.target.value)} required />
      </div>
      <div className="grid-2">
        <input placeholder="Estimated hosts" value={estimatedHosts} onChange={(e) => setEstimatedHosts(e.target.value)} />
        <input placeholder="Department / owner" value={department} onChange={(e) => setDepartment(e.target.value)} />
      </div>

      {(planningHint || facts) ? (
        <div className="validation-card">
          <strong>Subnetting insight</strong>
          <p className="muted" style={{ margin: "6px 0" }}>
            Segment role: <strong>{role.replace(/_/g, " ")}</strong>
            {planningHint ? <>
              {" "}• recommended minimum size: <strong>/{planningHint.recommendedPrefix}</strong> with about <strong>{planningHint.usableHosts}</strong> usable addresses.
            </> : null}
          </p>

          {facts ? (
            <div style={{ display: "grid", gap: 6 }}>
              <p className="muted" style={{ margin: 0 }}>
                Canonical subnet: <strong>{facts.canonicalCidr}</strong>
                {facts.canonicalCidr !== subnetCidr ? <> • entered value will be treated as <strong>{facts.canonicalCidr}</strong></> : null}
              </p>
              <p className="muted" style={{ margin: 0 }}>
                Network: <strong>{facts.networkAddress}</strong> • Broadcast: <strong>{facts.broadcastAddress}</strong>
              </p>
              <p className="muted" style={{ margin: 0 }}>
                First usable: <strong>{facts.firstUsableIp || "—"}</strong> • Last usable: <strong>{facts.lastUsableIp || "—"}</strong>
              </p>
              <p className="muted" style={{ margin: 0 }}>
                Mask: <strong>{facts.dottedMask}</strong> • Wildcard: <strong>{facts.wildcardMask}</strong> • Total: <strong>{facts.totalAddresses}</strong> • Usable: <strong>{facts.usableAddresses}</strong>
              </p>
              {currentUtilization ? (
                <p className="muted" style={{ margin: 0 }}>
                  Current headroom: <strong>{currentUtilization.headroom}</strong> • utilization: <strong>{Math.round(currentUtilization.utilization * 100)}%</strong>
                </p>
              ) : null}
              {selectedSite?.defaultAddressBlock ? (
                <p className="muted" style={{ margin: 0 }}>
                  Parent site block: <strong>{selectedSite.defaultAddressBlock}</strong> • placement: <strong>{insideParentBlock === null ? "review" : insideParentBlock ? "inside parent block" : "outside parent block"}</strong>
                </p>
              ) : null}
              {role === "WAN_TRANSIT" ? <p className="muted" style={{ margin: 0 }}>WAN transit segments may legitimately use /31 addressing for two-point links.</p> : null}
              {role === "LOOPBACK" ? <p className="muted" style={{ margin: 0 }}>Loopback-style addressing is usually a /32 host route rather than a normal user VLAN.</p> : null}
            </div>
          ) : null}

          {selectedSite?.defaultAddressBlock ? (
            subnetSuggestion ? (
              <div style={{ marginTop: 8 }}>
                <p className="muted" style={{ margin: "6px 0" }}>
                  Suggested placement inside site block <strong>{selectedSite.defaultAddressBlock}</strong>: <strong>{subnetSuggestion.subnetCidr}</strong> with gateway <strong>{subnetSuggestion.gatewayIp}</strong>.
                </p>
                <button type="button" onClick={() => { setSubnetCidr(subnetSuggestion.subnetCidr); setGatewayIp(subnetSuggestion.gatewayIp); }}>
                  Use Suggested Subnet
                </button>
              </div>
            ) : <p className="muted" style={{ marginTop: 8 }}>No fitting subnet suggestion was found inside <strong>{selectedSite.defaultAddressBlock}</strong> for the current estimate and segment role.</p>
          ) : null}
        </div>
      ) : null}

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
