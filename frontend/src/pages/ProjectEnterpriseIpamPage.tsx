import { type FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { SectionHeader } from "../components/app/SectionHeader";
import { LoadingState } from "../components/app/LoadingState";
import { ErrorState } from "../components/app/ErrorState";
import { useEnterpriseIpam, useEnterpriseIpamMutations } from "../features/enterprise-ipam/hooks";
import type { AddressFamily, BrownfieldDryRunResult } from "../features/enterprise-ipam/api";

function textValue(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || undefined;
}

function numberValue(formData: FormData, key: string) {
  const value = textValue(formData, key);
  return value ? Number(value) : undefined;
}

function boolValue(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function jsonArrayFromCommaList(value?: string) {
  if (!value) return undefined;
  return JSON.stringify(value.split(",").map((item) => item.trim()).filter(Boolean));
}

function badge(value?: string | number | null) {
  return <span className="badge-soft">{value ?? "—"}</span>;
}

function emptyCell(value?: string | number | null) {
  return value === undefined || value === null || value === "" ? "—" : value;
}

const BROWNFIELD_TEMPLATE = "routeDomainKey,cidr,siteName,vlanNumber,owner\ncorp,10.50.10.0/24,HQ,10,Existing Corp VLAN\ncorp,fd00:50:10::/64,HQ,10,Existing IPv6 Corp VLAN";

function parseBrownfieldNetworks(raw: string) {
  const rows = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .filter((line, index) => !(index === 0 && line.toLowerCase().startsWith("routedomainkey,")))
    .map((line) => {
      const [routeDomainKey, cidr, siteName, vlanNumber, ownerLabel] = line.split(",").map((item) => item.trim());
      const finalCidr = cidr || routeDomainKey;
      if (!finalCidr) throw new Error("Every brownfield import row needs a CIDR.");
      return {
        routeDomainKey: cidr ? routeDomainKey || undefined : undefined,
        cidr: finalCidr,
        addressFamily: finalCidr.includes(":") ? "IPV6" : "IPV4",
        siteName: siteName || undefined,
        vlanNumber: vlanNumber ? Number(vlanNumber) : undefined,
        ownerLabel: ownerLabel || undefined,
        sourceObjectKind: "NETWORK",
        confidence: "imported",
      };
    });
  if (!rows.length) throw new Error("Paste at least one brownfield network row.");
  return rows;
}

export function ProjectEnterpriseIpamPage() {
  const { projectId = "" } = useParams();
  const query = useEnterpriseIpam(projectId);
  const mutations = useEnterpriseIpamMutations(projectId);
  const [message, setMessage] = useState<string | null>(null);
  const [dryRunResult, setDryRunResult] = useState<BrownfieldDryRunResult | null>(null);
  const [conflictFilter, setConflictFilter] = useState<"open" | "all" | "resolved" | "blocked" | "review">("open");
  const data = query.data;

  async function submit(label: string, event: FormEvent<HTMLFormElement>, handler: (formData: FormData) => Promise<void>) {
    event.preventDefault();
    setMessage(null);
    try {
      await handler(new FormData(event.currentTarget));
      event.currentTarget.reset();
      setMessage(`${label} saved.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `${label} failed.`);
    }
  }

  if (query.isLoading) return <LoadingState title="Loading Engine 2 management" message="Loading VRFs, pools, allocations, DHCP scopes, brownfield evidence, approvals, and ledger entries." />;
  if (query.isError) return <ErrorState title="Unable to load Engine 2 management" message={query.error instanceof Error ? query.error.message : "SubnetOps could not load enterprise IPAM data."} />;
  if (!data) return <ErrorState title="Engine 2 data missing" message="The enterprise IPAM snapshot did not return usable data." />;

  const routeDomains = data.routeDomains;
  const ipPools = data.ipPools;
  const allocations = data.ipAllocations;
  const dhcpScopes = data.dhcpScopes;
  const reservations = data.ipReservations;
  const brownfieldNetworks = data.brownfieldNetworks;
  const approvals = data.allocationApprovals;
  const ledger = data.allocationLedger;
  const planRows = data.allocatorPosture?.allocationPlanRows ?? [];
  const currentInputHash = data.allocatorPosture?.currentInputHash ?? data.summary.currentInputHash ?? undefined;
  const conflictReview = data.brownfieldConflictReview;
  const conflicts = conflictReview?.conflicts ?? [];
  const visibleConflicts = conflicts.filter((conflict: any) => {
    if (conflictFilter === "all") return true;
    if (conflictFilter === "resolved") return conflict.resolutionStatus === "resolved";
    if (conflictFilter === "open") return conflict.resolutionStatus !== "resolved";
    return conflict.severity === conflictFilter;
  });

  async function previewBrownfieldFromForm(formData: FormData) {
    setMessage(null);
    try {
      const result = await mutations.previewBrownfieldImport.mutateAsync({
        sourceType: textValue(formData, "sourceType") || "manual-csv",
        sourceName: textValue(formData, "sourceName"),
        notes: textValue(formData, "notes"),
        networks: parseBrownfieldNetworks(textValue(formData, "networks") || ""),
      });
      setDryRunResult(result);
      setMessage(`Dry run complete: ${result.summary.validRows} clean rows, ${result.summary.conflictRows} conflict rows, ${result.summary.invalidRows} invalid rows.`);
    } catch (error) {
      setDryRunResult(null);
      setMessage(error instanceof Error ? error.message : "Brownfield dry run failed.");
    }
  }

  async function resolveBrownfieldConflict(conflict: any, formData: FormData) {
    setMessage(null);
    try {
      if (!conflict.conflictKey) throw new Error("Conflict key missing. Refresh Engine 2 IPAM and try again.");
      await mutations.createBrownfieldConflictResolution.mutateAsync({
        conflictKey: conflict.conflictKey,
        code: conflict.code,
        routeDomainKey: conflict.routeDomainKey,
        addressFamily: conflict.addressFamily,
        importedCidr: conflict.importedCidr,
        proposedCidr: conflict.proposedCidr,
        existingObjectType: conflict.existingObjectType,
        existingObjectId: conflict.existingObjectId,
        decision: textValue(formData, "decision"),
        reviewerLabel: textValue(formData, "reviewerLabel"),
        reason: textValue(formData, "reason"),
        designInputHash: textValue(formData, "designInputHash"),
        applySupersede: boolValue(formData, "applySupersede"),
      });
      setMessage(`Conflict ${conflict.importedCidr} resolved as ${textValue(formData, "decision")}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Conflict resolution failed.");
    }
  }

  async function materializePlanRow(row: any) {
    setMessage(null);
    try {
      await mutations.createAllocationFromPlan.mutateAsync({
        poolId: row.poolId,
        family: row.family,
        proposedCidr: row.proposedCidr,
        siteId: row.siteId,
        vlanNumber: row.vlanId,
        routeDomainKey: row.routeDomainKey,
        purpose: `Materialized allocator proposal for ${row.target}`,
        notes: row.explanation,
      });
      setMessage(`Plan row ${row.proposedCidr} materialized as a durable allocation.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Plan row materialization failed.");
    }
  }

  return (
    <section style={{ display: "grid", gap: 18 }}>
      <SectionHeader
        title="Engine 2 Enterprise IPAM Management"
        description="Manage the durable source-of-truth objects that the address allocator now uses: route domains, pools, allocations, DHCP scopes, reservations, brownfield evidence, approvals, and audit ledger."
        actions={<><Link to={`/projects/${projectId}/addressing`} className="link-button">Addressing Output</Link><Link to={`/projects/${projectId}/validation`} className="link-button">Validation</Link></>}
      />

      {message ? <div className="panel"><p className="muted" style={{ margin: 0 }}>{message}</p></div> : null}

      <div className="grid-2" style={{ gridTemplateColumns: "repeat(8, minmax(0, 1fr))" }}>
        <div className="panel">{badge(data.summary.routeDomainCount)}<h3>Route domains</h3><p className="muted">VRF-aware allocation boundary.</p></div>
        <div className="panel">{badge(data.summary.poolCount)}<h3>IP pools</h3><p className="muted">IPv4/IPv6 parent pools.</p></div>
        <div className="panel">{badge(data.summary.allocationCount)}<h3>Allocations</h3><p className="muted">Durable proposed/approved blocks.</p></div>
        <div className="panel">{badge(data.summary.brownfieldNetworkCount)}<h3>Brownfield networks</h3><p className="muted">Imported current-state evidence.</p></div>
        <div className="panel">{badge(data.summary.brownfieldBlockedConflictCount ?? 0)}<h3>Blocked conflicts</h3><p className="muted">Current-vs-proposed hard stops.</p></div>
        <div className="panel">{badge(data.summary.brownfieldReviewConflictCount ?? 0)}<h3>Review conflicts</h3><p className="muted">Needs engineer decision.</p></div>
        <div className="panel">{badge(data.summary.brownfieldResolvedConflictCount ?? 0)}<h3>Resolved conflicts</h3><p className="muted">Recorded engineer decisions.</p></div>
        <div className="panel">{badge(data.summary.brownfieldUnresolvedConflictCount ?? 0)}<h3>Open conflicts</h3><p className="muted">Still needs action.</p></div>
      </div>


      <div className="panel" style={{ display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0 }}>0. Safe edit console</h2>
        <p className="muted" style={{ margin: 0 }}>
          V1 exposes the backend PATCH routes directly in the UI. Edits still go through Engine 2 write-time guards, so overlapping pools, bad CIDRs, unsafe reservations, stale approvals, and brownfield conflicts are not silently accepted.
        </p>

        <details>
          <summary><strong>Edit route domains / VRFs</strong></summary>
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            {routeDomains.length ? routeDomains.map((domain: any) => (
              <form key={`edit-domain-${domain.id}`} onSubmit={(event) => submit("Route domain update", event, async (formData) => {
                await mutations.updateRouteDomain.mutateAsync({
                  id: domain.id,
                  input: {
                    routeDomainKey: textValue(formData, "routeDomainKey"),
                    name: textValue(formData, "name"),
                    vrfName: textValue(formData, "vrfName"),
                    routeDistinguisher: textValue(formData, "routeDistinguisher"),
                    description: textValue(formData, "description"),
                    allowOverlappingCidrs: boolValue(formData, "allowOverlappingCidrs"),
                  },
                });
              })} className="grid-2" style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr))" }}>
                <input name="routeDomainKey" defaultValue={domain.routeDomainKey} placeholder="Domain key" required />
                <input name="name" defaultValue={domain.name} placeholder="Name" required />
                <input name="vrfName" defaultValue={domain.vrfName ?? ""} placeholder="VRF name" />
                <input name="routeDistinguisher" defaultValue={domain.routeDistinguisher ?? ""} placeholder="RD" />
                <input name="description" defaultValue={domain.description ?? ""} placeholder="Description" />
                <label className="muted"><input name="allowOverlappingCidrs" type="checkbox" defaultChecked={Boolean(domain.allowOverlappingCidrs)} /> Overlap allowed</label>
                <button type="submit">Update {domain.routeDomainKey}</button>
              </form>
            )) : <p className="muted">No route domains to edit yet.</p>}
          </div>
        </details>

        <details>
          <summary><strong>Edit IP pools</strong></summary>
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            {ipPools.length ? ipPools.map((pool: any) => (
              <form key={`edit-pool-${pool.id}`} onSubmit={(event) => submit("IP pool update", event, async (formData) => {
                await mutations.updateIpPool.mutateAsync({
                  id: pool.id,
                  input: {
                    name: textValue(formData, "name"),
                    addressFamily: textValue(formData, "addressFamily"),
                    cidr: textValue(formData, "cidr"),
                    scope: textValue(formData, "scope"),
                    status: textValue(formData, "status"),
                    routeDomainId: textValue(formData, "routeDomainId"),
                    siteId: textValue(formData, "siteId"),
                    businessUnit: textValue(formData, "businessUnit"),
                    ownerLabel: textValue(formData, "ownerLabel"),
                    reservePercent: numberValue(formData, "reservePercent"),
                    noAllocate: boolValue(formData, "noAllocate"),
                    purpose: textValue(formData, "purpose"),
                    notes: textValue(formData, "notes"),
                  },
                });
              })} className="grid-2" style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr))" }}>
                <input name="name" defaultValue={pool.name} placeholder="Pool name" required />
                <select name="addressFamily" defaultValue={pool.addressFamily}><option>IPV4</option><option>IPV6</option></select>
                <input name="cidr" defaultValue={pool.cidr} placeholder="CIDR" required />
                <select name="scope" defaultValue={pool.scope}><option>ORGANIZATION</option><option>SITE</option><option>SEGMENT</option><option>TRANSIT</option><option>LOOPBACK</option><option>RESERVED</option></select>
                <select name="status" defaultValue={pool.status}><option>ACTIVE</option><option>RESERVED</option><option>DEPRECATED</option></select>
                <select name="routeDomainId" defaultValue={pool.routeDomainId ?? ""}><option value="">Default route domain</option>{routeDomains.map((domain: any) => <option key={domain.id} value={domain.id}>{domain.routeDomainKey}</option>)}</select>
                <select name="siteId" defaultValue={pool.siteId ?? ""}><option value="">No site binding</option>{data.sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select>
                <input name="businessUnit" defaultValue={pool.businessUnit ?? ""} placeholder="Business unit" />
                <input name="ownerLabel" defaultValue={pool.ownerLabel ?? ""} placeholder="Owner" />
                <input name="reservePercent" type="number" min="0" max="95" defaultValue={pool.reservePercent ?? 0} placeholder="Reserve %" />
                <input name="purpose" defaultValue={pool.purpose ?? ""} placeholder="Purpose" />
                <input name="notes" defaultValue={pool.notes ?? ""} placeholder="Notes / override tokens" />
                <label className="muted"><input name="noAllocate" type="checkbox" defaultChecked={Boolean(pool.noAllocate)} /> noAllocate</label>
                <button type="submit">Update {pool.name}</button>
              </form>
            )) : <p className="muted">No pools to edit yet.</p>}
          </div>
        </details>

        <details>
          <summary><strong>Edit durable allocations</strong></summary>
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            {allocations.length ? allocations.map((allocation: any) => (
              <form key={`edit-allocation-${allocation.id}`} onSubmit={(event) => submit("Allocation update", event, async (formData) => {
                await mutations.updateIpAllocation.mutateAsync({
                  id: allocation.id,
                  input: {
                    poolId: textValue(formData, "poolId"),
                    routeDomainId: textValue(formData, "routeDomainId"),
                    siteId: textValue(formData, "siteId"),
                    vlanId: textValue(formData, "vlanId"),
                    addressFamily: textValue(formData, "addressFamily"),
                    cidr: textValue(formData, "cidr"),
                    gatewayIp: textValue(formData, "gatewayIp"),
                    purpose: textValue(formData, "purpose"),
                    status: textValue(formData, "status"),
                    inputHash: textValue(formData, "inputHash"),
                    notes: textValue(formData, "notes"),
                  },
                });
              })} className="grid-2" style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr))" }}>
                <select name="poolId" defaultValue={allocation.poolId ?? ""}><option value="">No pool</option>{ipPools.map((pool: any) => <option key={pool.id} value={pool.id}>{pool.name} {pool.cidr}</option>)}</select>
                <select name="routeDomainId" defaultValue={allocation.routeDomainId ?? ""}><option value="">Default route domain</option>{routeDomains.map((domain: any) => <option key={domain.id} value={domain.id}>{domain.routeDomainKey}</option>)}</select>
                <select name="siteId" defaultValue={allocation.siteId ?? ""}><option value="">No site</option>{data.sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select>
                <select name="vlanId" defaultValue={allocation.vlanId ?? ""}><option value="">No VLAN</option>{data.vlans.map((vlan) => <option key={vlan.id} value={vlan.id}>{vlan.site?.name ?? "Site"} VLAN {vlan.vlanId} {vlan.vlanName}</option>)}</select>
                <select name="addressFamily" defaultValue={allocation.addressFamily}><option>IPV4</option><option>IPV6</option></select>
                <input name="cidr" defaultValue={allocation.cidr} placeholder="CIDR" required />
                <input name="gatewayIp" defaultValue={allocation.gatewayIp ?? ""} placeholder="Gateway IP" />
                <select name="status" defaultValue={allocation.status}><option>PROPOSED</option><option>REVIEW_REQUIRED</option><option>APPROVED</option><option>REJECTED</option><option>SUPERSEDED</option><option>IMPLEMENTED</option></select>
                <input name="purpose" defaultValue={allocation.purpose ?? ""} placeholder="Purpose" />
                <input name="inputHash" defaultValue={allocation.inputHash ?? currentInputHash ?? ""} placeholder="Engine 2 input hash" />
                <input name="notes" defaultValue={allocation.notes ?? ""} placeholder="Notes / override tokens" />
                <button type="submit">Update {allocation.cidr}</button>
              </form>
            )) : <p className="muted">No durable allocations to edit yet.</p>}
          </div>
        </details>

        <details>
          <summary><strong>Edit DHCP scopes</strong></summary>
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            {dhcpScopes.length ? dhcpScopes.map((scope: any) => (
              <form key={`edit-dhcp-${scope.id}`} onSubmit={(event) => submit("DHCP scope update", event, async (formData) => {
                await mutations.updateDhcpScope.mutateAsync({
                  id: scope.id,
                  input: {
                    allocationId: textValue(formData, "allocationId"),
                    addressFamily: textValue(formData, "addressFamily"),
                    scopeCidr: textValue(formData, "scopeCidr"),
                    defaultGateway: textValue(formData, "defaultGateway"),
                    dnsServersJson: textValue(formData, "dnsServersJson"),
                    excludedRangesJson: textValue(formData, "excludedRangesJson"),
                    relayTargetsJson: textValue(formData, "relayTargetsJson"),
                    optionsJson: textValue(formData, "optionsJson"),
                    leaseSeconds: numberValue(formData, "leaseSeconds"),
                    serverLocation: textValue(formData, "serverLocation"),
                  },
                });
              })} className="grid-2" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
                <select name="allocationId" defaultValue={scope.allocationId ?? ""}><option value="">No allocation binding</option>{allocations.map((allocation: any) => <option key={allocation.id} value={allocation.id}>{allocation.cidr}</option>)}</select>
                <select name="addressFamily" defaultValue={scope.addressFamily}><option>IPV4</option><option>IPV6</option></select>
                <input name="scopeCidr" defaultValue={scope.scopeCidr} placeholder="Scope CIDR" required />
                <input name="defaultGateway" defaultValue={scope.defaultGateway ?? ""} placeholder="Default gateway" />
                <input name="dnsServersJson" defaultValue={scope.dnsServersJson ?? ""} placeholder='DNS JSON, e.g. ["10.0.0.10"]' />
                <input name="excludedRangesJson" defaultValue={scope.excludedRangesJson ?? ""} placeholder='Excluded ranges JSON, e.g. ["10.0.0.1-10.0.0.20"]' />
                <input name="relayTargetsJson" defaultValue={scope.relayTargetsJson ?? ""} placeholder='Relay targets JSON, e.g. ["10.0.0.5"]' />
                <input name="optionsJson" defaultValue={scope.optionsJson ?? ""} placeholder="Options JSON array" />
                <input name="leaseSeconds" type="number" defaultValue={scope.leaseSeconds ?? ""} placeholder="Lease seconds" />
                <input name="serverLocation" defaultValue={scope.serverLocation ?? ""} placeholder="Server location" />
                <button type="submit">Update {scope.scopeCidr}</button>
              </form>
            )) : <p className="muted">No DHCP scopes to edit yet.</p>}
          </div>
        </details>

        <details>
          <summary><strong>Edit reservations</strong></summary>
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            {reservations.length ? reservations.map((reservation: any) => (
              <form key={`edit-reservation-${reservation.id}`} onSubmit={(event) => submit("Reservation update", event, async (formData) => {
                await mutations.updateIpReservation.mutateAsync({
                  id: reservation.id,
                  input: {
                    dhcpScopeId: textValue(formData, "dhcpScopeId"),
                    allocationId: textValue(formData, "allocationId"),
                    addressFamily: textValue(formData, "addressFamily"),
                    ipAddress: textValue(formData, "ipAddress"),
                    macAddress: textValue(formData, "macAddress"),
                    hostname: textValue(formData, "hostname"),
                    ownerLabel: textValue(formData, "ownerLabel"),
                    purpose: textValue(formData, "purpose"),
                    notes: textValue(formData, "notes"),
                  },
                });
              })} className="grid-2" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
                <select name="dhcpScopeId" defaultValue={reservation.dhcpScopeId ?? ""}><option value="">No DHCP scope binding</option>{dhcpScopes.map((scope: any) => <option key={scope.id} value={scope.id}>{scope.scopeCidr}</option>)}</select>
                <select name="allocationId" defaultValue={reservation.allocationId ?? ""}><option value="">No allocation binding</option>{allocations.map((allocation: any) => <option key={allocation.id} value={allocation.id}>{allocation.cidr}</option>)}</select>
                <select name="addressFamily" defaultValue={reservation.addressFamily}><option>IPV4</option><option>IPV6</option></select>
                <input name="ipAddress" defaultValue={reservation.ipAddress} placeholder="Reserved IP" required />
                <input name="macAddress" defaultValue={reservation.macAddress ?? ""} placeholder="MAC" />
                <input name="hostname" defaultValue={reservation.hostname ?? ""} placeholder="Hostname" />
                <input name="ownerLabel" defaultValue={reservation.ownerLabel ?? ""} placeholder="Owner" />
                <input name="purpose" defaultValue={reservation.purpose ?? ""} placeholder="Purpose" />
                <input name="notes" defaultValue={reservation.notes ?? ""} placeholder="Notes" />
                <button type="submit">Update {reservation.ipAddress}</button>
              </form>
            )) : <p className="muted">No reservations to edit yet.</p>}
          </div>
        </details>

        <details>
          <summary><strong>Edit brownfield networks</strong></summary>
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            {brownfieldNetworks.length ? brownfieldNetworks.map((network: any) => (
              <form key={`edit-brownfield-${network.id}`} onSubmit={(event) => submit("Brownfield network update", event, async (formData) => {
                await mutations.updateBrownfieldNetwork.mutateAsync({
                  id: network.id,
                  input: {
                    routeDomainKey: textValue(formData, "routeDomainKey"),
                    addressFamily: textValue(formData, "addressFamily"),
                    cidr: textValue(formData, "cidr"),
                    siteName: textValue(formData, "siteName"),
                    vlanNumber: numberValue(formData, "vlanNumber"),
                    ownerLabel: textValue(formData, "ownerLabel"),
                    confidence: textValue(formData, "confidence"),
                    notes: textValue(formData, "notes"),
                  },
                });
              })} className="grid-2" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
                <input name="routeDomainKey" defaultValue={network.routeDomainKey ?? ""} placeholder="Route domain key" />
                <select name="addressFamily" defaultValue={network.addressFamily}><option>IPV4</option><option>IPV6</option></select>
                <input name="cidr" defaultValue={network.cidr} placeholder="CIDR" required />
                <input name="siteName" defaultValue={network.siteName ?? ""} placeholder="Site name" />
                <input name="vlanNumber" type="number" min="1" max="4094" defaultValue={network.vlanNumber ?? ""} placeholder="VLAN" />
                <input name="ownerLabel" defaultValue={network.ownerLabel ?? ""} placeholder="Owner" />
                <input name="confidence" defaultValue={network.confidence ?? "imported"} placeholder="Confidence" />
                <input name="notes" defaultValue={network.notes ?? ""} placeholder="Notes" />
                <button type="submit">Update {network.cidr}</button>
              </form>
            )) : <p className="muted">No brownfield networks to edit yet.</p>}
          </div>
        </details>
      </div>

      <div className="panel" style={{ display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0 }}>1. Route domains / VRFs</h2>
        <form onSubmit={(event) => submit("Route domain", event, async (formData) => {
          await mutations.createRouteDomain.mutateAsync({
            routeDomainKey: textValue(formData, "routeDomainKey"),
            name: textValue(formData, "name"),
            vrfName: textValue(formData, "vrfName"),
            routeDistinguisher: textValue(formData, "routeDistinguisher"),
            allowOverlappingCidrs: boolValue(formData, "allowOverlappingCidrs"),
            description: textValue(formData, "description"),
          });
        })} className="grid-2" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
          <input name="routeDomainKey" placeholder="Route domain key, e.g. corp" required />
          <input name="name" placeholder="Name, e.g. Corporate VRF" required />
          <input name="vrfName" placeholder="VRF name" />
          <input name="routeDistinguisher" placeholder="Route distinguisher" />
          <input name="description" placeholder="Description" />
          <label className="muted"><input name="allowOverlappingCidrs" type="checkbox" /> Allow overlapping CIDRs in this domain</label>
          <button type="submit">Create route domain</button>
        </form>
        <div style={{ overflowX: "auto" }}>
          <table><thead><tr><th align="left">Key</th><th align="left">Name</th><th align="left">VRF</th><th align="left">Overlap</th><th align="left">Action</th></tr></thead><tbody>{routeDomains.map((domain: any) => <tr key={domain.id}><td>{domain.routeDomainKey}</td><td>{domain.name}</td><td>{emptyCell(domain.vrfName)}</td><td>{domain.allowOverlappingCidrs ? "Allowed" : "Blocked"}</td><td><button type="button" onClick={() => mutations.deleteRouteDomain.mutate(domain.id)}>Delete</button></td></tr>)}</tbody></table>
        </div>
      </div>

      <div className="panel" style={{ display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0 }}>2. IPv4 / IPv6 pools</h2>
        <form onSubmit={(event) => submit("IP pool", event, async (formData) => {
          await mutations.createIpPool.mutateAsync({
            name: textValue(formData, "name"),
            addressFamily: textValue(formData, "addressFamily") as AddressFamily,
            cidr: textValue(formData, "cidr"),
            scope: textValue(formData, "scope"),
            routeDomainId: textValue(formData, "routeDomainId"),
            siteId: textValue(formData, "siteId"),
            businessUnit: textValue(formData, "businessUnit"),
            ownerLabel: textValue(formData, "ownerLabel"),
            reservePercent: numberValue(formData, "reservePercent"),
            noAllocate: boolValue(formData, "noAllocate"),
            purpose: textValue(formData, "purpose"),
          });
        })} className="grid-2" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
          <input name="name" placeholder="Pool name" required />
          <select name="addressFamily" defaultValue="IPV4"><option>IPV4</option><option>IPV6</option></select>
          <input name="cidr" placeholder="CIDR, e.g. 10.50.0.0/16 or fd00:50::/48" required />
          <select name="scope" defaultValue="SITE"><option>ORGANIZATION</option><option>SITE</option><option>SEGMENT</option><option>TRANSIT</option><option>LOOPBACK</option><option>RESERVED</option></select>
          <select name="routeDomainId" defaultValue=""><option value="">Default route domain</option>{routeDomains.map((domain: any) => <option key={domain.id} value={domain.id}>{domain.routeDomainKey}</option>)}</select>
          <select name="siteId" defaultValue=""><option value="">No site binding</option>{data.sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select>
          <input name="businessUnit" placeholder="Business unit" />
          <input name="ownerLabel" placeholder="Owner" />
          <input name="reservePercent" type="number" min="0" max="95" defaultValue="20" placeholder="Reserve %" />
          <input name="purpose" placeholder="Purpose" />
          <label className="muted"><input name="noAllocate" type="checkbox" /> Reserve only / no allocate</label>
          <button type="submit">Create pool</button>
        </form>
        <div style={{ overflowX: "auto" }}>
          <table><thead><tr><th align="left">Pool</th><th align="left">Family</th><th align="left">CIDR</th><th align="left">Scope</th><th align="left">VRF</th><th align="left">Reserve</th><th align="left">Action</th></tr></thead><tbody>{ipPools.map((pool: any) => <tr key={pool.id}><td>{pool.name}</td><td>{pool.addressFamily}</td><td>{pool.cidr}</td><td>{pool.scope}</td><td>{pool.routeDomain?.routeDomainKey ?? "default"}</td><td>{pool.reservePercent}%</td><td><button type="button" onClick={() => mutations.deleteIpPool.mutate(pool.id)}>Delete</button></td></tr>)}</tbody></table>
        </div>
      </div>

      <div className="panel" style={{ display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0 }}>3. Allocator plan materialization</h2>
        <p className="muted" style={{ margin: 0 }}>These are backend-generated Engine 2 allocator proposals. Creating one here persists it as a durable allocation with the current input hash; it is still proposed/review-required, not approved.</p>
        <p className="muted" style={{ margin: 0 }}><strong>Current Engine 2 input hash:</strong> {emptyCell(currentInputHash)}</p>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead><tr><th align="left">Family</th><th align="left">Pool</th><th align="left">Target</th><th align="left">Prefix</th><th align="left">Proposed CIDR</th><th align="left">Status</th><th align="left">Action</th></tr></thead>
            <tbody>
              {planRows.length ? planRows.slice(0, 30).map((row: any) => {
                const alreadyDurable = allocations.some((allocation: any) => allocation.poolId === row.poolId && allocation.cidr === row.proposedCidr);
                const canMaterialize = row.status === "allocated" && row.proposedCidr && !alreadyDurable;
                return <tr key={`${row.poolId}-${row.family}-${row.target}-${row.proposedCidr ?? row.requestedPrefix}`}>
                  <td>{row.family}</td><td>{row.poolName}</td><td>{row.target}</td><td>/{row.requestedPrefix}</td><td>{emptyCell(row.proposedCidr)}</td><td>{alreadyDurable ? "durable" : row.status}</td>
                  <td><button type="button" disabled={!canMaterialize} onClick={() => materializePlanRow(row)}>{alreadyDurable ? "Already durable" : "Create durable allocation"}</button></td>
                </tr>;
              }) : <tr><td colSpan={7}>No allocator plan rows yet. Add active IPv4/IPv6 pools first.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel" style={{ display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0 }}>4. Durable allocations</h2>
        <form onSubmit={(event) => submit("Allocation", event, async (formData) => {
          await mutations.createIpAllocation.mutateAsync({
            poolId: textValue(formData, "poolId"),
            routeDomainId: textValue(formData, "routeDomainId"),
            siteId: textValue(formData, "siteId"),
            vlanId: textValue(formData, "vlanId"),
            addressFamily: textValue(formData, "addressFamily") as AddressFamily,
            cidr: textValue(formData, "cidr"),
            gatewayIp: textValue(formData, "gatewayIp"),
            purpose: textValue(formData, "purpose"),
            status: textValue(formData, "status"),
            confidence: "configured",
            source: "management-interface",
          });
        })} className="grid-2" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
          <select name="poolId" defaultValue=""><option value="">No pool</option>{ipPools.map((pool: any) => <option key={pool.id} value={pool.id}>{pool.name} {pool.cidr}</option>)}</select>
          <select name="routeDomainId" defaultValue=""><option value="">Default route domain</option>{routeDomains.map((domain: any) => <option key={domain.id} value={domain.id}>{domain.routeDomainKey}</option>)}</select>
          <select name="siteId" defaultValue=""><option value="">No site</option>{data.sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select>
          <select name="vlanId" defaultValue=""><option value="">No VLAN</option>{data.vlans.map((vlan) => <option key={vlan.id} value={vlan.id}>{vlan.site?.name ?? "Site"} VLAN {vlan.vlanId} {vlan.vlanName}</option>)}</select>
          <select name="addressFamily" defaultValue="IPV4"><option>IPV4</option><option>IPV6</option></select>
          <input name="cidr" placeholder="Allocated CIDR" required />
          <input name="gatewayIp" placeholder="Gateway IP" />
          <select name="status" defaultValue="PROPOSED"><option>PROPOSED</option><option>REVIEW_REQUIRED</option><option>APPROVED</option><option>IMPLEMENTED</option></select>
          <input name="purpose" placeholder="Purpose" />
          <button type="submit">Create allocation</button>
        </form>
        <div style={{ overflowX: "auto" }}>
          <table><thead><tr><th align="left">CIDR</th><th align="left">Family</th><th align="left">Status</th><th align="left">Pool</th><th align="left">Site/VLAN</th><th align="left">Gateway</th><th align="left">Actions</th></tr></thead><tbody>{allocations.map((allocation: any) => <tr key={allocation.id}><td>{allocation.cidr}</td><td>{allocation.addressFamily}</td><td>{allocation.status}</td><td>{allocation.pool?.name ?? "—"}</td><td>{allocation.site?.name ?? "—"}{allocation.vlan ? ` / VLAN ${allocation.vlan.vlanId}` : ""}</td><td>{emptyCell(allocation.gatewayIp)}</td><td style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><button type="button" onClick={() => mutations.updateIpAllocationStatus.mutate({ id: allocation.id, input: { status: "APPROVED", summary: "Approved from Engine 2 management interface.", designInputHash: currentInputHash } })}>Approve</button><button type="button" onClick={() => mutations.updateIpAllocationStatus.mutate({ id: allocation.id, input: { status: "IMPLEMENTED", summary: "Marked implemented from Engine 2 management interface.", designInputHash: currentInputHash } })}>Implemented</button><button type="button" onClick={() => mutations.deleteIpAllocation.mutate(allocation.id)}>Delete</button></td></tr>)}</tbody></table>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="panel" style={{ display: "grid", gap: 12 }}>
          <h2 style={{ margin: 0 }}>5. DHCP scopes</h2>
          <form onSubmit={(event) => submit("DHCP scope", event, async (formData) => {
            await mutations.createDhcpScope.mutateAsync({
              allocationId: textValue(formData, "allocationId"),
              addressFamily: textValue(formData, "addressFamily") as AddressFamily,
              scopeCidr: textValue(formData, "scopeCidr"),
              defaultGateway: textValue(formData, "defaultGateway"),
              dnsServersJson: jsonArrayFromCommaList(textValue(formData, "dnsServers")),
              leaseSeconds: numberValue(formData, "leaseSeconds"),
              optionsJson: textValue(formData, "optionsJson"),
              relayTargetsJson: jsonArrayFromCommaList(textValue(formData, "relayTargets")),
              serverLocation: textValue(formData, "serverLocation"),
            });
          })} style={{ display: "grid", gap: 8 }}>
            <select name="allocationId" defaultValue=""><option value="">No allocation binding</option>{allocations.map((allocation: any) => <option key={allocation.id} value={allocation.id}>{allocation.cidr}</option>)}</select>
            <select name="addressFamily" defaultValue="IPV4"><option>IPV4</option><option>IPV6</option></select>
            <input name="scopeCidr" placeholder="Scope CIDR" required />
            <input name="defaultGateway" placeholder="Default gateway" />
            <input name="dnsServers" placeholder="DNS servers, comma separated" />
            <input name="relayTargets" placeholder="Relay/helper targets, comma separated" />
            <input name="leaseSeconds" type="number" placeholder="Lease seconds" />
            <input name="serverLocation" placeholder="Server location" />
            <input name="optionsJson" placeholder='Options JSON, e.g. [{"code":66,"value":"10.0.0.10"}]' />
            <button type="submit">Create DHCP scope</button>
          </form>
          <table><thead><tr><th align="left">Scope</th><th align="left">Gateway</th><th align="left">DNS</th><th align="left">Action</th></tr></thead><tbody>{dhcpScopes.map((scope: any) => <tr key={scope.id}><td>{scope.scopeCidr}</td><td>{emptyCell(scope.defaultGateway)}</td><td>{emptyCell(scope.dnsServersJson)}</td><td><button type="button" onClick={() => mutations.deleteDhcpScope.mutate(scope.id)}>Delete</button></td></tr>)}</tbody></table>
        </div>

        <div className="panel" style={{ display: "grid", gap: 12 }}>
          <h2 style={{ margin: 0 }}>6. Reservations</h2>
          <form onSubmit={(event) => submit("Reservation", event, async (formData) => {
            await mutations.createIpReservation.mutateAsync({
              dhcpScopeId: textValue(formData, "dhcpScopeId"),
              allocationId: textValue(formData, "allocationId"),
              addressFamily: textValue(formData, "addressFamily") as AddressFamily,
              ipAddress: textValue(formData, "ipAddress"),
              macAddress: textValue(formData, "macAddress"),
              hostname: textValue(formData, "hostname"),
              ownerLabel: textValue(formData, "ownerLabel"),
              purpose: textValue(formData, "purpose"),
            });
          })} style={{ display: "grid", gap: 8 }}>
            <select name="dhcpScopeId" defaultValue=""><option value="">No DHCP scope binding</option>{dhcpScopes.map((scope: any) => <option key={scope.id} value={scope.id}>{scope.scopeCidr}</option>)}</select>
            <select name="allocationId" defaultValue=""><option value="">No allocation binding</option>{allocations.map((allocation: any) => <option key={allocation.id} value={allocation.id}>{allocation.cidr}</option>)}</select>
            <select name="addressFamily" defaultValue="IPV4"><option>IPV4</option><option>IPV6</option></select>
            <input name="ipAddress" placeholder="Reserved IP" required />
            <input name="macAddress" placeholder="MAC address" />
            <input name="hostname" placeholder="Hostname" />
            <input name="ownerLabel" placeholder="Owner" />
            <input name="purpose" placeholder="Purpose" />
            <button type="submit">Create reservation</button>
          </form>
          <table><thead><tr><th align="left">IP</th><th align="left">Host</th><th align="left">Owner</th><th align="left">Action</th></tr></thead><tbody>{reservations.map((reservation: any) => <tr key={reservation.id}><td>{reservation.ipAddress}</td><td>{emptyCell(reservation.hostname)}</td><td>{emptyCell(reservation.ownerLabel)}</td><td><button type="button" onClick={() => mutations.deleteIpReservation.mutate(reservation.id)}>Delete</button></td></tr>)}</tbody></table>
        </div>
      </div>

      <div className="panel" style={{ display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0 }}>7. Brownfield import</h2>
        <p className="muted" style={{ margin: 0 }}>Paste one network per line. Header rows and comment lines beginning with # are ignored. Format: <code>routeDomainKey,cidr,siteName,vlanNumber,owner</code>. If you only paste a CIDR, SubnetOps treats it as the default route domain.</p>
        <form onSubmit={(event) => submit("Brownfield import", event, async (formData) => {
          await mutations.createBrownfieldImport.mutateAsync({
            sourceType: textValue(formData, "sourceType") || "manual-csv",
            sourceName: textValue(formData, "sourceName"),
            notes: textValue(formData, "notes"),
            networks: parseBrownfieldNetworks(textValue(formData, "networks") || ""),
          });
        })} style={{ display: "grid", gap: 8 }}>
          <input name="sourceType" defaultValue="manual-csv" placeholder="Source type" />
          <input name="sourceName" placeholder="Source name, e.g. Old IPAM export" />
          <textarea name="networks" rows={7} defaultValue={BROWNFIELD_TEMPLATE} required />
          <input name="notes" placeholder="Import notes" />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={(event) => {
              const form = event.currentTarget.form;
              if (form) void previewBrownfieldFromForm(new FormData(form));
            }}>Preview import risk</button>
            <button type="submit">Commit brownfield import</button>
          </div>
        </form>

        {dryRunResult ? <div className="panel" style={{ display: "grid", gap: 10 }}>
          <h3 style={{ margin: 0 }}>Brownfield dry-run preview</h3>
          <p className="muted" style={{ margin: 0 }}>
            {dryRunResult.summary.totalRows} rows checked · {dryRunResult.summary.validRows} clean · {dryRunResult.summary.conflictRows} conflict · {dryRunResult.summary.duplicateRows} duplicate · {dryRunResult.summary.invalidRows} invalid · {dryRunResult.summary.blockedConflicts} blocked conflicts.
          </p>
          <div style={{ overflowX: "auto" }}>
            <table><thead><tr><th align="left">Row</th><th align="left">Status</th><th align="left">Route domain</th><th align="left">Family</th><th align="left">CIDR</th><th align="left">Findings</th></tr></thead><tbody>{dryRunResult.rows.map((row) => <tr key={`${row.rowNumber}-${row.cidr}`}><td>{row.rowNumber}</td><td>{row.status}</td><td>{row.routeDomainKey}</td><td>{row.addressFamily}</td><td>{row.cidr}</td><td>{row.findings.length ? row.findings.join(" | ") : "Clean parse"}</td></tr>)}</tbody></table>
          </div>
          {dryRunResult.conflicts.length ? <div style={{ overflowX: "auto" }}>
            <table><thead><tr><th align="left">Severity</th><th align="left">Imported</th><th align="left">Conflicts with</th><th align="left">Detail</th><th align="left">Recommended action</th></tr></thead><tbody>{dryRunResult.conflicts.slice(0, 25).map((conflict, index) => <tr key={`${conflict.code}-${conflict.importedCidr}-${index}`}><td>{conflict.severity}</td><td>{conflict.importedCidr}</td><td>{conflict.existingObjectType} {emptyCell(conflict.proposedCidr)}</td><td>{conflict.detail}</td><td>{conflict.recommendedAction}</td></tr>)}</tbody></table>
          </div> : null}
        </div> : null}

        <div style={{ overflowX: "auto" }}><table><thead><tr><th align="left">Route domain</th><th align="left">CIDR</th><th align="left">Site</th><th align="left">VLAN</th><th align="left">Owner</th><th align="left">Action</th></tr></thead><tbody>{brownfieldNetworks.map((network: any) => <tr key={network.id}><td>{network.routeDomainKey ?? "default"}</td><td>{network.cidr}</td><td>{emptyCell(network.siteName)}</td><td>{emptyCell(network.vlanNumber)}</td><td>{emptyCell(network.ownerLabel)}</td><td><button type="button" onClick={() => mutations.deleteBrownfieldNetwork.mutate(network.id)}>Delete</button></td></tr>)}</tbody></table></div>
      </div>

      <div className="panel" style={{ display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0 }}>8. Current vs proposed conflict review</h2>
        <p className="muted" style={{ margin: 0 }}>This compares saved brownfield current-state networks against durable allocations, DHCP scopes, IP pools, and allocator plan rows. V1 adds durable conflict decisions, so review outcomes are no longer lost after refresh.</p>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <label className="muted">Filter conflicts</label>
          <select value={conflictFilter} onChange={(event) => setConflictFilter(event.target.value as typeof conflictFilter)}>
            <option value="open">Open only</option>
            <option value="blocked">Blocked</option>
            <option value="review">Review</option>
            <option value="resolved">Resolved</option>
            <option value="all">All</option>
          </select>
          <span className="muted">{visibleConflicts.length} shown / {conflicts.length} total</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table><thead><tr><th align="left">State</th><th align="left">Severity</th><th align="left">Route domain</th><th align="left">Imported current state</th><th align="left">Proposed/durable object</th><th align="left">Action required</th><th align="left">Decision</th></tr></thead><tbody>{visibleConflicts.length ? visibleConflicts.map((conflict: any, index: number) => <tr key={`${conflict.conflictKey ?? conflict.code}-${index}`}><td>{conflict.resolutionStatus === "resolved" ? `Resolved: ${conflict.resolution?.decision ?? "recorded"}` : "Open"}</td><td>{conflict.severity}</td><td>{conflict.routeDomainKey}</td><td>{conflict.importedCidr}</td><td>{conflict.existingObjectType} {emptyCell(conflict.proposedCidr)}</td><td>{conflict.recommendedAction}</td><td><form onSubmit={(event) => submit("Conflict resolution", event, async (formData) => resolveBrownfieldConflict(conflict, formData))} style={{ display: "grid", gap: 6, minWidth: 260 }}><select name="decision" defaultValue={conflict.existingObjectType === "durable allocation" ? "SUPERSEDE_PROPOSED" : "ACCEPT_BROWNFIELD"}><option>ACCEPT_BROWNFIELD</option><option>KEEP_PROPOSED</option><option>IGNORE_NOT_APPLICABLE</option><option>SUPERSEDE_PROPOSED</option><option>SPLIT_REQUIRED</option><option>CHANGE_WINDOW_REQUIRED</option></select><input name="reviewerLabel" placeholder="Reviewer" /><input name="designInputHash" defaultValue={currentInputHash} placeholder="Current Engine 2 input hash" /><textarea name="reason" rows={2} placeholder="Required decision reason / evidence" required /><label className="muted"><input name="applySupersede" type="checkbox" disabled={conflict.existingObjectType !== "durable allocation"} /> Apply supersede to durable allocation</label><button type="submit">Record decision</button></form></td></tr>) : <tr><td colSpan={7}>No saved brownfield conflicts match this filter.</td></tr>}</tbody></table>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="panel" style={{ display: "grid", gap: 12 }}>
          <h2 style={{ margin: 0 }}>9. Approval workflow</h2>
          <form onSubmit={(event) => submit("Approval", event, async (formData) => {
            await mutations.createAllocationApproval.mutateAsync({
              allocationId: textValue(formData, "allocationId"),
              decision: textValue(formData, "decision"),
              reviewerLabel: textValue(formData, "reviewerLabel"),
              reason: textValue(formData, "reason"),
              designInputHash: textValue(formData, "designInputHash"),
            });
          })} style={{ display: "grid", gap: 8 }}>
            <select name="allocationId" required defaultValue=""><option value="">Select allocation</option>{allocations.map((allocation: any) => <option key={allocation.id} value={allocation.id}>{allocation.cidr} ({allocation.status})</option>)}</select>
            <select name="decision" defaultValue="APPROVED"><option>APPROVED</option><option>REJECTED</option><option>NEEDS_CHANGES</option></select>
            <input name="reviewerLabel" placeholder="Reviewer" />
            <input name="designInputHash" defaultValue={currentInputHash} placeholder="Current Engine 2 input hash" />
            <textarea name="reason" rows={3} placeholder="Reviewer reason / evidence" />
            <button type="submit">Record approval decision</button>
          </form>
          <table><thead><tr><th align="left">Decision</th><th align="left">Allocation</th><th align="left">Reviewer</th><th align="left">Reason</th></tr></thead><tbody>{approvals.map((approval: any) => <tr key={approval.id}><td>{approval.decision}</td><td>{approval.allocation?.cidr ?? approval.allocationId}</td><td>{emptyCell(approval.reviewerLabel)}</td><td>{emptyCell(approval.reason)}</td></tr>)}</tbody></table>
        </div>
        <div className="panel" style={{ display: "grid", gap: 12 }}>
          <h2 style={{ margin: 0 }}>10. Allocation ledger</h2>
          <p className="muted" style={{ margin: 0 }}>Last 100 allocation events. This is the audit trail that stops the allocator from silently changing trusted IP space.</p>
          <table><thead><tr><th align="left">Action</th><th align="left">Allocation</th><th align="left">Summary</th><th align="left">Hash</th></tr></thead><tbody>{ledger.map((entry: any) => <tr key={entry.id}><td>{entry.action}</td><td>{entry.allocation?.cidr ?? "—"}</td><td>{entry.summary}</td><td>{emptyCell(entry.designInputHash)}</td></tr>)}</tbody></table>
        </div>
      </div>
    </section>
  );
}
