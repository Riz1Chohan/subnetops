import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useProjects, useCreateTemplateProject } from "../features/projects/hooks";
import { ProjectCard } from "../features/projects/components/ProjectCard";
import { useCurrentUser } from "../features/auth/hooks";
import { useAcceptInvitation, useCreateOrganization, useCreateOrganizationInvitation, useMyInvitations, useOrganizationEmailOutbox, useOrganizationInvitations, useOrganizationMembers, useOrganizations, useRemoveOrganizationMember, useRevokeOrganizationInvitation, useTransferOrganizationOwnership, useUpdateOrganizationMemberRole } from "../features/organizations/hooks";
import { NotificationPanel } from "../features/notifications/components/NotificationPanel";
import { useAssignedTasks, useQueueMyDigest } from "../features/comments/hooks";
import { useNotificationPreferences, useUpdateNotificationPreferences } from "../features/notification-preferences/hooks";
import { UsageBanner } from "../components/app/UsageBanner";

const templates = [
  {
    key: "small-office" as const,
    name: "Small Office",
    description: "Admin, guest, and server VLAN starter.",
  },
  {
    key: "branch-office" as const,
    name: "Branch Office",
    description: "HQ + branch starter with voice and management.",
  },
  {
    key: "clinic-starter" as const,
    name: "Clinic Starter",
    description: "Healthcare segmentation with admin, clinical, guest, and management.",
  },
];

export function DashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useProjects();
  const authQuery = useCurrentUser();
  const templateMutation = useCreateTemplateProject();
  const [query, setQuery] = useState("");
  const [environmentFilter, setEnvironmentFilter] = useState("all");
  const [orgName, setOrgName] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"OWNER" | "ADMIN" | "MEMBER">("MEMBER");
  const organizationsQuery = useOrganizations();
  const createOrgMutation = useCreateOrganization();
  const invitesForMeQuery = useMyInvitations();
  const orgMembersQuery = useOrganizationMembers(selectedOrgId);
  const orgInvitesQuery = useOrganizationInvitations(selectedOrgId);
  const orgEmailOutboxQuery = useOrganizationEmailOutbox(selectedOrgId);
  const createInviteMutation = useCreateOrganizationInvitation(selectedOrgId);
  const revokeInviteMutation = useRevokeOrganizationInvitation(selectedOrgId);
  const updateMemberRoleMutation = useUpdateOrganizationMemberRole(selectedOrgId);
  const removeMemberMutation = useRemoveOrganizationMember(selectedOrgId);
  const transferOwnershipMutation = useTransferOrganizationOwnership(selectedOrgId);
  const acceptInviteMutation = useAcceptInvitation();
  const notificationPreferencesQuery = useNotificationPreferences();
  const updateNotificationPreferencesMutation = useUpdateNotificationPreferences();
  const assignedTasksQuery = useAssignedTasks();
  const queueDigestMutation = useQueueMyDigest();
  const overdueTaskCount = (assignedTasksQuery.data ?? []).filter((task) => task.dueDate && task.taskStatus !== "DONE" && new Date(task.dueDate).getTime() < Date.now()).length;

  const environmentOptions = useMemo(() => {
    const values = Array.from(new Set((data ?? []).map((item) => item.environmentType).filter(Boolean)));
    return values;
  }, [data]);

  const filteredProjects = useMemo(() => {
    return (data ?? []).filter((project) => {
      const haystack = `${project.name} ${project.organizationName || ""} ${project.environmentType || ""}`.toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase());
      const matchesEnvironment = environmentFilter === "all" || project.environmentType === environmentFilter;
      return matchesQuery && matchesEnvironment;
    });
  }, [data, query, environmentFilter]);

  return (
    <section style={{ display: "grid", gap: 18 }}>
      <div className="panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ marginBottom: 8 }}>Dashboard</h1>
          <p className="muted" style={{ margin: 0 }}>Your recent network planning projects.</p>
        </div>
        <Link to="/projects/new"><button type="button">Create project</button></Link>
      </div>

      <UsageBanner
        planTier={authQuery.data?.user.planTier}
        projectCount={data?.length ?? 0}
      />

      <NotificationPanel />

      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ marginTop: 0 }}>Task Snapshot</h2>
            <p className="muted" style={{ margin: 0 }}>Your current review workload at a glance.</p>
          </div>
          <Link to="/my-tasks" className="link-button">Open My Tasks</Link>
        </div>
        <div className="summary-grid">
          <div className="summary-card"><div className="muted">Assigned</div><div className="value">{assignedTasksQuery.data?.length ?? 0}</div></div>
          <div className="summary-card"><div className="muted">Overdue</div><div className="value">{overdueTaskCount}</div></div>
        </div>
      </div>

      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <h2 style={{ marginTop: 0 }}>Notification Settings</h2>
          <button type="button" onClick={async () => { const result = await queueDigestMutation.mutateAsync(); window.alert(result.queued ? `Digest queued. Open: ${result.open ?? 0}, Overdue: ${result.overdue ?? 0}.` : result.reason || "Digest not queued."); }} disabled={queueDigestMutation.isPending}>{queueDigestMutation.isPending ? "Queueing..." : "Queue My Digest"}</button>
        </div>
        {notificationPreferencesQuery.data ? (
          <div style={{ display: "grid", gap: 10 }}>
            {[
              ["inAppInvites", "In-app invite alerts"],
              ["inAppMentions", "In-app mention alerts"],
              ["emailInvites", "Email invite delivery"],
              ["emailMentions", "Email mention delivery"],
              ["overdueReminders", "Overdue reminder emails"],
              ["emailDigests", "Email digests"],
            ].map(([key, label]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={Boolean((notificationPreferencesQuery.data as any)[key])}
                  onChange={async (e) => {
                    await updateNotificationPreferencesMutation.mutateAsync({ [key]: e.target.checked } as any);
                  }}
                /> {label}
              </label>
            ))}
            <label>
              Digest frequency
              <select value={notificationPreferencesQuery.data.digestFrequency} onChange={async (e) => { await updateNotificationPreferencesMutation.mutateAsync({ digestFrequency: e.target.value as any }); }}>
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
              </select>
            </label>
          </div>
        ) : <p className="muted">Loading settings...</p>}
      </div>

      <div className="panel">
        <div className="toolbar-row">
          <input
            placeholder="Search projects by name, organization, or environment"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select value={environmentFilter} onChange={(e) => setEnvironmentFilter(e.target.value)}>
            <option value="all">All environments</option>
            {environmentOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      </div>


      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Organizations</h2>
        <div className="toolbar-row">
          <input placeholder="New organization name" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
          <button type="button" disabled={createOrgMutation.isPending || !orgName.trim()} onClick={async () => { await createOrgMutation.mutateAsync(orgName); setOrgName(""); }}>
            {createOrgMutation.isPending ? "Creating..." : "Create Organization"}
          </button>
          <select value={selectedOrgId} onChange={(e) => setSelectedOrgId(e.target.value)}>
            <option value="">Select organization</option>
            {(organizationsQuery.data ?? []).map((org) => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        </div>
        <div className="legend" style={{ marginTop: 12 }}>
          {(organizationsQuery.data ?? []).map((org) => (
            <div key={org.id} className="legend-item">{org.name} • {org.role}</div>
          ))}
          {!organizationsQuery.isLoading && (organizationsQuery.data ?? []).length === 0 ? <p className="muted">No organizations yet.</p> : null}
        </div>

        {selectedOrgId ? (
          <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
            <div className="toolbar-row">
              <input placeholder="Invite user email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as "OWNER" | "ADMIN" | "MEMBER") }>
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
                <option value="OWNER">Owner</option>
              </select>
              <button type="button" disabled={createInviteMutation.isPending || !inviteEmail.trim()} onClick={async () => { await createInviteMutation.mutateAsync({ email: inviteEmail, role: inviteRole }); setInviteEmail(""); }}>
                {createInviteMutation.isPending ? "Inviting..." : "Create Invite"}
              </button>
            </div>

            <div>
              <h3>Members</h3>
              <div style={{ display: "grid", gap: 10 }}>
                {(orgMembersQuery.data ?? []).map((member) => (
                  <div key={member.id} className="validation-card">
                    <strong>{member.user.fullName || member.user.email}</strong>
                    <p className="muted" style={{ margin: "6px 0" }}>{member.user.email} • {member.role}</p>
                    <div className="form-actions">
                      <button type="button" onClick={async () => { await updateMemberRoleMutation.mutateAsync({ membershipId: member.id, role: "MEMBER" }); }}>Set Member</button>
                      <button type="button" onClick={async () => { await updateMemberRoleMutation.mutateAsync({ membershipId: member.id, role: "ADMIN" }); }}>Set Admin</button>
                      <button type="button" onClick={async () => { await transferOwnershipMutation.mutateAsync(member.id); }}>Transfer Owner</button>
                      <button type="button" onClick={async () => { await removeMemberMutation.mutateAsync(member.id); }}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3>Pending Invites</h3>
              <div style={{ display: "grid", gap: 10 }}>
                {(orgInvitesQuery.data ?? []).filter((invite) => invite.status === "PENDING").map((invite) => (
                  <div key={invite.id} className="validation-card">
                    <strong>{invite.email}</strong>
                    <p className="muted" style={{ margin: "6px 0" }}>{invite.role}</p>
                    <button type="button" onClick={async () => { await revokeInviteMutation.mutateAsync(invite.id); }}>Revoke</button>
                  </div>
                ))}
                {!orgInvitesQuery.isLoading && ((orgInvitesQuery.data ?? []).filter((invite) => invite.status === "PENDING").length === 0) ? <p className="muted">No pending invites.</p> : null}
              </div>
            </div>

            <div>
              <h3>Invite Email Queue</h3>
              <div style={{ display: "grid", gap: 10 }}>
                {(orgEmailOutboxQuery.data ?? []).map((item) => (
                  <div key={item.id} className="validation-card">
                    <strong>{item.subject}</strong>
                    <p className="muted" style={{ margin: "6px 0" }}>{item.toEmail} • {item.status}</p>
                  </div>
                ))}
                {!orgEmailOutboxQuery.isLoading && (orgEmailOutboxQuery.data ?? []).length === 0 ? <p className="muted">No queued invite emails yet.</p> : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>


      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Pending Invitations</h2>
        <div style={{ display: "grid", gap: 10 }}>
          {(invitesForMeQuery.data ?? []).map((invite) => (
            <div key={invite.id} className="validation-card">
              <strong>{invite.organization?.name}</strong>
              <p className="muted" style={{ margin: "6px 0" }}>{invite.email} • {invite.role}</p>
              <button type="button" disabled={acceptInviteMutation.isPending} onClick={async () => { await acceptInviteMutation.mutateAsync(invite.token); }}>
                {acceptInviteMutation.isPending ? "Accepting..." : "Accept Invitation"}
              </button>
            </div>
          ))}
          {!invitesForMeQuery.isLoading && (invitesForMeQuery.data ?? []).length === 0 ? <p className="muted">No pending invitations.</p> : null}
        </div>
      </div>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Quick Templates</h2>
        <p className="muted">Start from a common network layout instead of building from scratch.</p>
        <div className="grid-cards">
          {templates.map((template) => (
            <div key={template.key} className="card-link" style={{ cursor: "default" }}>
              <h3 style={{ marginTop: 0 }}>{template.name}</h3>
              <p className="muted">{template.description}</p>
              <button
                type="button"
                disabled={templateMutation.isPending}
                onClick={async () => {
                  const project = await templateMutation.mutateAsync({ templateKey: template.key });
                  navigate(`/projects/${project.id}`);
                }}
              >
                {templateMutation.isPending ? "Creating..." : "Use Template"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {isLoading && <p className="muted">Loading projects...</p>}
      {error && <p className="error-text">Could not load projects.</p>}

      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Projects</h2>
          <span className="muted">Showing {filteredProjects.length} of {data?.length ?? 0}</span>
        </div>
        <div className="grid-cards">
          {filteredProjects.map((project) => <ProjectCard key={project.id} project={project} />)}
        </div>
        {!isLoading && filteredProjects.length === 0 ? <p className="muted">No projects match your current search.</p> : null}
      </div>
    </section>
  );
}
