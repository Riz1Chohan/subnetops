import { useEffect, useMemo, useState } from "react";
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

/**
 * Input collection only.
 *
 * Subnet sizing, role classification, gateway convention checks, parent-block
 * containment, and suggested allocations are backend design-core responsibilities.
 * This form intentionally avoids browser-side planning helpers.
 */
export function VlanForm({
  sites,
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

  const error = useMemo(() => {
    const vlanNumber = Number(vlanId);
    if (!siteId) return "Select a site first.";
    if (!Number.isInteger(vlanNumber) || vlanNumber < 1 || vlanNumber > 4094) return "VLAN ID must be between 1 and 4094.";
    if (!vlanName.trim()) return "VLAN name is required.";
    if (!subnetCidr.trim()) return "Subnet CIDR is required.";
    if (!gatewayIp.trim()) return "Gateway IP is required.";
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
          subnetCidr: subnetCidr.trim(),
          gatewayIp: gatewayIp.trim(),
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

      <div className="validation-card">
        <strong>Backend-owned subnet authority</strong>
        <p className="muted" style={{ margin: "6px 0 0" }}>
          The frontend stores your inputs only. CIDR canonicalization, usable-address counts, gateway validation,
          parent-block containment, right-sizing, and allocation suggestions are produced by backend design-core after save.
        </p>
      </div>

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
