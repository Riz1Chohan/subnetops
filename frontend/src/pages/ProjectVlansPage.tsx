import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { Vlan } from "../lib/types";
import { VlanForm } from "../features/vlans/components/VlanForm";
import { VlanTable } from "../features/vlans/components/VlanTable";
import { useCreateVlan, useDeleteVlan, useUpdateVlan } from "../features/vlans/hooks";
import { useProjectSites, useProjectVlans } from "../features/projects/hooks";
import { SectionHeader } from "../components/app/SectionHeader";
import { LoadingState } from "../components/app/LoadingState";
import { ErrorState } from "../components/app/ErrorState";

function vlanCategory(vlan: Vlan) {
  const text = `${vlan.vlanName} ${vlan.purpose || ""} ${vlan.department || ""}`.toLowerCase();
  if (text.includes("guest")) return "guest";
  if (text.includes("server")) return "servers";
  if (text.includes("management") || text.includes("mgmt")) return "management";
  if (text.includes("voice")) return "voice";
  if (text.includes("clinical") || text.includes("medical")) return "clinical";
  if (text.includes("admin")) return "admin";
  return "other";
}

export function ProjectVlansPage() {
  const navigate = useNavigate();
  const { projectId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const sitesQuery = useProjectSites(projectId);
  const vlansQuery = useProjectVlans(projectId);

  const createVlanMutation = useCreateVlan(projectId);
  const updateVlanMutation = useUpdateVlan(projectId);
  const deleteVlanMutation = useDeleteVlan(projectId);

  const [showCreate, setShowCreate] = useState(false);
  const [editingVlan, setEditingVlan] = useState<Vlan | null>(null);
  const [vlanQuery, setVlanQuery] = useState("");
  const [siteFilter, setSiteFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortMode, setSortMode] = useState("vlan-asc");

  const sites = sitesQuery.data ?? [];
  const vlans = vlansQuery.data ?? [];
  const editId = searchParams.get("edit");
  const returnToValidation = searchParams.get("returnTo") === "validation";

  useEffect(() => {
    if (!editId || vlans.length === 0) return;
    const match = vlans.find((vlan) => vlan.id === editId);
    if (!match) return;
    setEditingVlan((current) => current?.id === match.id ? current : match);
    setShowCreate(false);
  }, [editId, vlans]);

  function clearEditQuery() {
    if (!searchParams.has("edit")) return;
    const next = new URLSearchParams(searchParams);
    next.delete("edit");
    setSearchParams(next, { replace: true });
  }

  const filteredVlans = useMemo(() => {
    const filtered = vlans.filter((vlan) => {
      const haystack = `${vlan.vlanName} ${vlan.purpose || ""} ${vlan.subnetCidr} ${vlan.gatewayIp} ${vlan.site?.name || ""}`.toLowerCase();
      const matchesQuery = haystack.includes(vlanQuery.toLowerCase());
      const matchesSite = siteFilter === "all" || vlan.site?.id === siteFilter || vlan.siteId === siteFilter;
      const matchesCategory = categoryFilter === "all" || vlanCategory(vlan) === categoryFilter;
      return matchesQuery && matchesSite && matchesCategory;
    });

    filtered.sort((a, b) => {
      switch (sortMode) {
        case "name-asc":
          return a.vlanName.localeCompare(b.vlanName);
        case "site-asc":
          return (a.site?.name || "").localeCompare(b.site?.name || "");
        case "vlan-desc":
          return b.vlanId - a.vlanId;
        case "vlan-asc":
        default:
          return a.vlanId - b.vlanId;
      }
    });

    return filtered;
  }, [vlans, vlanQuery, siteFilter, categoryFilter, sortMode]);

  const isSubmitting = createVlanMutation.isPending || updateVlanMutation.isPending;
  const hasActiveFilters = Boolean(vlanQuery.trim()) || siteFilter !== "all" || categoryFilter !== "all";

  return (
    <section style={{ display: "grid", gap: 18 }}>
      <SectionHeader
        title="VLANs"
        description="Manage VLANs, subnet roles, address boundaries, and capacity planning in a more realistic IP workspace."
        actions={
          !showCreate && !editingVlan ? (
            <button type="button" onClick={() => setShowCreate(true)}>Add VLAN</button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setShowCreate(false);
                setEditingVlan(null);
                clearEditQuery();
              }}
            >
              Close Form
            </button>
          )
        }
      />

      {returnToValidation ? (
        <div className="panel" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap", background: "rgba(17,24,39,0.03)" }}>
          <div>
            <strong style={{ display: "block", marginBottom: 6 }}>Validation fix workflow</strong>
            <p className="muted" style={{ margin: 0 }}>Make the change here, save it, and then return to validation to confirm the finding drops out of the review list.</p>
          </div>
          <Link to={`/projects/${projectId}/validation`} className="link-button">Back to Validation</Link>
        </div>
      ) : null}

      {showCreate || editingVlan ? (
        <div className="panel">
          <VlanForm
            sites={sites}
            existingVlans={vlans}
            initialValues={editingVlan}
            submitLabel={editingVlan ? "Update VLAN" : "Create VLAN"}
            onCancel={() => {
              setShowCreate(false);
              setEditingVlan(null);
              clearEditQuery();
            }}
            isSubmitting={isSubmitting}
            onSubmit={async (values) => {
              if (editingVlan) {
                await updateVlanMutation.mutateAsync({ vlanId: editingVlan.id, values });
                setEditingVlan(null);
                setShowCreate(false);
                clearEditQuery();
                if (returnToValidation) {
                  navigate(`/projects/${projectId}/validation?refreshed=1`);
                }
                return;
              }

              await createVlanMutation.mutateAsync(values);
              setShowCreate(false);
              clearEditQuery();
              if (returnToValidation) {
                navigate(`/projects/${projectId}/validation?refreshed=1`);
              }
            }}
          />
        </div>
      ) : null}

      <div className="panel">
        <div className="toolbar-row" style={{ marginBottom: 12 }}>
          <input
            placeholder="Search VLANs, subnets, gateways, or site"
            value={vlanQuery}
            onChange={(e) => setVlanQuery(e.target.value)}
          />

          <select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)}>
            <option value="all">All sites</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>

          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="all">All categories</option>
            <option value="admin">Admin</option>
            <option value="guest">Guest</option>
            <option value="servers">Servers</option>
            <option value="management">Management</option>
            <option value="voice">Voice</option>
            <option value="clinical">Clinical</option>
            <option value="other">Other</option>
          </select>

          <select value={sortMode} onChange={(e) => setSortMode(e.target.value)}>
            <option value="vlan-asc">Sort: VLAN ID ↑</option>
            <option value="vlan-desc">Sort: VLAN ID ↓</option>
            <option value="name-asc">Sort: Name A–Z</option>
            <option value="site-asc">Sort: Site A–Z</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <span className="badge-soft">Showing {filteredVlans.length} of {vlans.length}</span>
          {hasActiveFilters ? <span className="badge-soft">Filtered view</span> : null}
        </div>

        {vlansQuery.isLoading ? (
          <LoadingState title="Loading VLANs" message="Gathering VLAN records, gateways, and subnet details for this project." />
        ) : vlansQuery.isError ? (
          <ErrorState
            title="Unable to load VLANs"
            message={vlansQuery.error instanceof Error ? vlansQuery.error.message : "SubnetOps could not load the VLAN workspace right now."}
            action={<Link to={`/projects/${projectId}/overview`} className="link-button">Back to Overview</Link>}
          />
        ) : (
          <VlanTable
            vlans={filteredVlans}
            emptyTitle={hasActiveFilters ? "No VLANs match this view" : "No VLANs added yet"}
            emptyMessage={hasActiveFilters ? "Try clearing the search or filters to see more of the planned VLAN workspace." : "Add your first VLAN to start planning subnets, gateways, and segmentation rules."}
            onEdit={(vlan) => {
              setEditingVlan(vlan);
              setShowCreate(false);
            }}
            deletingVlanId={deleteVlanMutation.isPending ? deleteVlanMutation.variables ?? null : null}
            onDelete={async (vlan) => {
              if (!window.confirm(`Delete VLAN ${vlan.vlanId} (${vlan.vlanName})?`)) return;
              await deleteVlanMutation.mutateAsync(vlan.id);
              if (editingVlan?.id === vlan.id) {
                setEditingVlan(null);
              }
            }}
          />
        )}
      </div>
    </section>
  );
}
