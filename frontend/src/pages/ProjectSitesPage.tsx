import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import type { Site } from "../lib/types";
import { SiteForm } from "../features/sites/components/SiteForm";
import { SiteTable } from "../features/sites/components/SiteTable";
import { useCreateSite, useDeleteSite, useUpdateSite } from "../features/sites/hooks";
import { useProjectSites } from "../features/projects/hooks";
import { SectionHeader } from "../components/app/SectionHeader";
import { LoadingState } from "../components/app/LoadingState";
import { ErrorState } from "../components/app/ErrorState";

export function ProjectSitesPage() {
  const { projectId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const sitesQuery = useProjectSites(projectId);
  const createSiteMutation = useCreateSite(projectId);
  const updateSiteMutation = useUpdateSite(projectId);
  const deleteSiteMutation = useDeleteSite(projectId);

  const [showCreate, setShowCreate] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [siteQuery, setSiteQuery] = useState("");

  const sites = sitesQuery.data ?? [];
  const editId = searchParams.get("edit");

  useEffect(() => {
    if (!editId || sites.length === 0) return;
    const match = sites.find((site) => site.id === editId);
    if (!match) return;
    setEditingSite((current) => current?.id === match.id ? current : match);
    setShowCreate(false);
  }, [editId, sites]);

  function clearEditQuery() {
    if (!searchParams.has("edit")) return;
    const next = new URLSearchParams(searchParams);
    next.delete("edit");
    setSearchParams(next, { replace: true });
  }
  const filteredSites = useMemo(() => {
    const needle = siteQuery.trim().toLowerCase();
    if (!needle) return sites;
    return sites.filter((site) => `${site.name} ${site.location || ""} ${site.siteCode || ""} ${site.defaultAddressBlock || ""}`.toLowerCase().includes(needle));
  }, [sites, siteQuery]);
  const isSubmitting = createSiteMutation.isPending || updateSiteMutation.isPending;

  return (
    <section style={{ display: "grid", gap: 18 }}>
      <SectionHeader
        title="Sites"
        description="Manage site locations and their default address blocks in a more operational workspace."
        actions={
          !showCreate && !editingSite ? (
            <button type="button" onClick={() => setShowCreate(true)}>Add Site</button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setShowCreate(false);
                setEditingSite(null);
                clearEditQuery();
              }}
            >
              Close Form
            </button>
          )
        }
      />

      {showCreate || editingSite ? (
        <div className="panel">
          <SiteForm
            projectId={projectId}
            initialValues={editingSite}
            submitLabel={editingSite ? "Update site" : "Create site"}
            onCancel={() => {
              setShowCreate(false);
              setEditingSite(null);
              clearEditQuery();
            }}
            isSubmitting={isSubmitting}
            onSubmit={async (values) => {
              if (editingSite) {
                await updateSiteMutation.mutateAsync({ siteId: editingSite.id, values });
                setEditingSite(null);
                setShowCreate(false);
                clearEditQuery();
                return;
              }

              await createSiteMutation.mutateAsync(values);
              setShowCreate(false);
              clearEditQuery();
            }}
          />
        </div>
      ) : null}

      <div className="panel">
        <div className="toolbar-row" style={{ marginBottom: 12, justifyContent: "space-between" }}>
          <input
            placeholder="Search site name, code, location, or address block"
            value={siteQuery}
            onChange={(event) => setSiteQuery(event.target.value)}
          />
          <span className="badge-soft">Showing {filteredSites.length} of {sites.length}</span>
        </div>

        {sitesQuery.isLoading ? (
          <LoadingState title="Loading sites" message="Gathering site records and address blocks for this project." />
        ) : sitesQuery.isError ? (
          <ErrorState
            title="Unable to load sites"
            message={sitesQuery.error instanceof Error ? sitesQuery.error.message : "SubnetOps could not load the site list right now."}
            action={<Link to={`/projects/${projectId}/overview`} className="link-button">Back to Overview</Link>}
          />
        ) : (
          <SiteTable
            sites={filteredSites}
            onEdit={(site) => {
              setEditingSite(site);
              setShowCreate(false);
            }}
            deletingSiteId={deleteSiteMutation.isPending ? deleteSiteMutation.variables ?? null : null}
            onDelete={async (site) => {
              if (!window.confirm(`Delete site ${site.name}? Any linked VLANs will also be removed.`)) return;
              await deleteSiteMutation.mutateAsync(site.id);
              if (editingSite?.id === site.id) {
                setEditingSite(null);
              }
            }}
          />
        )}
      </div>
    </section>
  );
}
