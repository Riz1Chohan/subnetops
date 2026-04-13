import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useProject, useProjectSites, useProjectVlans, useDuplicateProject } from "../features/projects/hooks";
import { useRunValidation, useValidationResults } from "../features/validation/hooks";
import { ValidationList } from "../features/validation/components/ValidationList";
import { useCreateSite, useDeleteSite, useUpdateSite } from "../features/sites/hooks";
import { SiteForm } from "../features/sites/components/SiteForm";
import { SiteTable } from "../features/sites/components/SiteTable";
import { useCreateVlan, useDeleteVlan, useUpdateVlan } from "../features/vlans/hooks";
import { VlanForm } from "../features/vlans/components/VlanForm";
import { VlanTable } from "../features/vlans/components/VlanTable";
import type { Site, Vlan } from "../lib/types";
import { useCurrentUser } from "../features/auth/hooks";
import { UsageBanner } from "../components/app/UsageBanner";
import { ProjectDiagram } from "../features/diagram/components/ProjectDiagram";
import { CommentPanel } from "../features/comments/components/CommentPanel";
import { ActivityFeed } from "../features/report/components/ActivityFeed";
import { TaskBoard } from "../features/comments/components/TaskBoard";
import { TeamWorkloadBoard } from "../features/comments/components/TeamWorkloadBoard";
import { useBulkReassignProjectTasks, useCreateProjectComment, useMentionSuggestions, useQueueProjectOverdueReminders } from "../features/comments/hooks";
import { useProjectWatchers, useUnwatchProject, useWatchProject } from "../features/project-watchers/hooks";
import { useProjectComments } from "../features/comments/hooks";
import { apiUrl } from "../lib/api";

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

export function ProjectOverviewPage() {
  const { projectId = "" } = useParams();
  const { data: project, isLoading } = useProject(projectId);
  const authQuery = useCurrentUser();
  const navigateDuplicate = (id: string) => { window.location.href = `/projects/${id}`; };
  const sitesQuery = useProjectSites(projectId);
  const vlansQuery = useProjectVlans(projectId);
  const createSiteMutation = useCreateSite(projectId);
  const updateSiteMutation = useUpdateSite(projectId);
  const deleteSiteMutation = useDeleteSite(projectId);
  const createVlanMutation = useCreateVlan(projectId);
  const updateVlanMutation = useUpdateVlan(projectId);
  const deleteVlanMutation = useDeleteVlan(projectId);
  const validationQuery = useValidationResults(projectId);
  const duplicateMutation = useDuplicateProject();
  const validationMutation = useRunValidation(projectId);
  const commentsQuery = useProjectComments(projectId);
  const createCommentMutation = useCreateProjectComment(projectId);
  const mentionSuggestionsQuery = useMentionSuggestions(projectId);
  const bulkReassignMutation = useBulkReassignProjectTasks(projectId);
  const queueRemindersMutation = useQueueProjectOverdueReminders(projectId);
  const watchersQuery = useProjectWatchers(projectId);
  const watchMutation = useWatchProject(projectId);
  const unwatchMutation = useUnwatchProject(projectId);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [editingVlan, setEditingVlan] = useState<Vlan | null>(null);
  const [vlanQuery, setVlanQuery] = useState("");
  const [siteFilter, setSiteFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortMode, setSortMode] = useState("vlan-asc");
  const [selectedAnnotationTarget, setSelectedAnnotationTarget] = useState<{ targetType: "SITE" | "VLAN"; targetId: string } | null>(null);

  if (isLoading) return <p className="muted">Loading project...</p>;
  if (!project) return <p className="error-text">Project not found.</p>;

  const sites = sitesQuery.data ?? [];
  const vlans = vlansQuery.data ?? [];
  const safeSites = useMemo(() => sites, [sites]);

  const bulkAssigneeOptions = useMemo(() => {
    const self = authQuery.data?.user ? [{ id: authQuery.data.user.id, email: authQuery.data.user.email, fullName: authQuery.data.user.fullName, mentionToken: `@${authQuery.data.user.email.split("@")[0]}` }] : [];
    const merged = [...self, ...(mentionSuggestionsQuery.data ?? [])];
    const seen = new Set<string>();
    return merged.filter((item) => { if (seen.has(item.id)) return false; seen.add(item.id); return true; });
  }, [authQuery.data?.user, mentionSuggestionsQuery.data]);

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

  const enrichedProject = {
    ...project,
    sites: project.sites.map((site) => ({
      ...site,
      vlans: vlans.filter((vlan) => vlan.site?.id === site.id || vlan.siteId === site.id),
    })),
  };

  return (
    <section style={{ display: "grid", gap: 18 }}>
      <div className="panel">
        <h1 style={{ marginBottom: 8 }}>{project.name}</h1>
        <p className="muted" style={{ margin: 0 }}>{project.organizationName || "No organization name set"}</p>
        <p className="muted">{project.description || "No description yet"}</p>
        <div className="actions">
          <button onClick={() => validationMutation.mutate()} disabled={validationMutation.isPending}>
            {validationMutation.isPending ? "Running validation..." : "Run validation"}
          </button>
          <a href={apiUrl(`/export/projects/${projectId}/csv`)} target="_blank" rel="noreferrer" className="link-button">
            Export CSV
          </a>
          <a href={apiUrl(`/export/projects/${projectId}/pdf`)} target="_blank" rel="noreferrer" className="link-button">
            Export PDF
          </a>
          <Link to={`/projects/${projectId}/report`} className="link-button">
            Open Report
          </Link>
          {project.canEdit ? <Link to={`/projects/${projectId}/settings`} className="link-button">
            Settings
          </Link> : null}
          <button
            type="button"
            onClick={async () => {
              const duplicate = await duplicateMutation.mutateAsync(projectId);
              navigateDuplicate(duplicate.id);
            }}
            disabled={duplicateMutation.isPending}
          >
            {duplicateMutation.isPending ? "Duplicating..." : "Duplicate Project"}
          </button>
        </div>
      </div>

      <UsageBanner
        planTier={authQuery.data?.user.planTier}
        siteCount={sites.length}
        vlanCount={vlans.length}
      />

      <ProjectDiagram project={enrichedProject} onSelectTarget={(targetType, targetId) => setSelectedAnnotationTarget({ targetType, targetId })} />

      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0 }}>Watchers</h2>
            <p className="muted" style={{ margin: 0 }}>Subscribers who follow updates on this project.</p>
          </div>
          {watchersQuery.data?.some((item) => item.userId === authQuery.data?.user.id) ? (
            <button type="button" onClick={async () => { await unwatchMutation.mutateAsync(); }} disabled={unwatchMutation.isPending}>
              {unwatchMutation.isPending ? "Updating..." : "Unwatch Project"}
            </button>
          ) : (
            <button type="button" onClick={async () => { await watchMutation.mutateAsync(); }} disabled={watchMutation.isPending}>
              {watchMutation.isPending ? "Updating..." : "Watch Project"}
            </button>
          )}
        </div>
        <div className="legend" style={{ marginTop: 12 }}>
          {(watchersQuery.data ?? []).map((watcher) => (
            <div key={watcher.id} className="legend-item">{watcher.user.fullName || watcher.user.email}</div>
          ))}
          {!watchersQuery.isLoading && (watchersQuery.data ?? []).length === 0 ? <p className="muted">No watchers yet.</p> : null}
        </div>
      </div>

      <CommentPanel projectId={projectId} sites={sites} vlans={vlans} preselectedTarget={selectedAnnotationTarget} currentUserId={authQuery.data?.user.id} canEditProject={project.canEdit} />

      {project.changeLogs && project.changeLogs.length > 0 ? <ActivityFeed items={project.changeLogs} /> : null}

      <TaskBoard comments={commentsQuery.data ?? []} currentUserId={authQuery.data?.user.id} mentionOptions={bulkAssigneeOptions} onBulkReassign={project.canEdit ? async (ids, assignedToUserId) => { const result = await bulkReassignMutation.mutateAsync({ commentIds: ids, assignedToUserId }); window.alert(`Reassigned ${result.updated} task(s).`); } : undefined} onQueueReminders={project.canEdit ? async () => { const result = await queueRemindersMutation.mutateAsync(); window.alert(`Queued ${result.queued} overdue reminder(s).`); } : undefined} />

      <TeamWorkloadBoard comments={commentsQuery.data ?? []} />

      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <h2 style={{ marginBottom: 8 }}>Workflow</h2>
            <span className={project.approvalStatus === "APPROVED" ? "badge badge-info" : project.approvalStatus === "IN_REVIEW" ? "badge badge-warning" : "badge badge-error"}>
              {project.approvalStatus === "APPROVED" ? "Approved" : project.approvalStatus === "IN_REVIEW" ? "In Review" : "Draft"}
            </span>
            <p className="muted">{project.reviewerNotes || "No reviewer notes added yet."}</p>
          </div>
        </div>
      </div>


      {project.canEdit ? <div className="grid-2">
        <SiteForm
          projectId={projectId}
          initialValues={editingSite}
          submitLabel={editingSite ? "Update site" : "Create site"}
          onCancel={editingSite ? () => setEditingSite(null) : undefined}
          isSubmitting={createSiteMutation.isPending || updateSiteMutation.isPending}
          onSubmit={async (values) => {
            if (editingSite) {
              await updateSiteMutation.mutateAsync({ siteId: editingSite.id, values });
              setEditingSite(null);
              return;
            }
            await createSiteMutation.mutateAsync(values);
          }}
        />

        <VlanForm
          sites={safeSites}
          existingVlans={vlans}
          initialValues={editingVlan}
          submitLabel={editingVlan ? "Update VLAN" : "Create VLAN"}
          onCancel={editingVlan ? () => setEditingVlan(null) : undefined}
          isSubmitting={createVlanMutation.isPending || updateVlanMutation.isPending}
          onSubmit={async (values) => {
            if (editingVlan) {
              await updateVlanMutation.mutateAsync({ vlanId: editingVlan.id, values });
              setEditingVlan(null);
              return;
            }
            await createVlanMutation.mutateAsync(values);
          }}
        />
      </div> : null}

      <div className="panel">
        <h2>Sites</h2>
        {sitesQuery.isLoading ? (
          <p className="muted">Loading sites...</p>
        ) : (
          <SiteTable
            sites={sites}
            onEdit={project.canEdit ? (site) => setEditingSite(site) : undefined}
            deletingSiteId={deleteSiteMutation.isPending ? deleteSiteMutation.variables ?? null : null}
            onDelete={project.canEdit ? async (site) => {
              if (!window.confirm(`Delete site ${site.name}? Any linked VLANs will also be removed.`)) return;
              await deleteSiteMutation.mutateAsync(site.id);
              if (editingSite?.id === site.id) setEditingSite(null);
            } : undefined}
          />
        )}
      </div>

      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>VLANs</h2>
          <span className="muted">Showing {filteredVlans.length} of {vlans.length}</span>
        </div>
        <div className="toolbar-row" style={{ margin: "12px 0" }}>
          <input placeholder="Search VLANs, subnets, gateways, or site" value={vlanQuery} onChange={(e) => setVlanQuery(e.target.value)} />
          <select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)}>
            <option value="all">All sites</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>{site.name}</option>
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
        {vlansQuery.isLoading ? (
          <p className="muted">Loading VLANs...</p>
        ) : (
          <VlanTable
            vlans={filteredVlans}
            onEdit={project.canEdit ? (vlan) => setEditingVlan(vlan) : undefined}
            deletingVlanId={deleteVlanMutation.isPending ? deleteVlanMutation.variables ?? null : null}
            onDelete={project.canEdit ? async (vlan) => {
              if (!window.confirm(`Delete VLAN ${vlan.vlanId} (${vlan.vlanName})?`)) return;
              await deleteVlanMutation.mutateAsync(vlan.id);
              if (editingVlan?.id === vlan.id) setEditingVlan(null);
            } : undefined}
          />
        )}
      </div>

      <div className="panel">
        <h2>Validation</h2>
        {validationQuery.isLoading ? <p className="muted">Loading validation results...</p> : <ValidationList items={validationQuery.data ?? []} onConvertToTask={async (item) => { const body = `[Validation] ${item.title} — ${item.message}`; const existing = (commentsQuery.data ?? []).some((comment) => comment.body === body); if (existing) { window.alert("A task for this validation finding already exists."); return; } await createCommentMutation.mutateAsync({ body, taskStatus: "OPEN", targetType: item.entityType === "SITE" ? "SITE" : item.entityType === "VLAN" ? "VLAN" : "PROJECT", targetId: item.entityId || undefined }); }} />}
      </div>
    </section>
  );
}