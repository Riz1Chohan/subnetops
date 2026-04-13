import { useState } from "react";
import { useParams } from "react-router-dom";
import type { Site } from "../lib/types";
import { SiteForm } from "../features/sites/components/SiteForm";
import { SiteTable } from "../features/sites/components/SiteTable";
import { useCreateSite, useDeleteSite, useUpdateSite } from "../features/sites/hooks";
import { useProjectSites } from "../features/projects/hooks";

export function ProjectSitesPage() {
  const { projectId = "" } = useParams();
  const sitesQuery = useProjectSites(projectId);
  const createSiteMutation = useCreateSite(projectId);
  const updateSiteMutation = useUpdateSite(projectId);
  const deleteSiteMutation = useDeleteSite(projectId);

  const [showCreate, setShowCreate] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);

  const sites = sitesQuery.data ?? [];
  const isSubmitting = createSiteMutation.isPending || updateSiteMutation.isPending;

  return (
    <section style={{ display: "grid", gap: 18 }}>
      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ marginBottom: 8 }}>Sites</h1>
            <p className="muted" style={{ margin: 0 }}>
              Manage site locations and their default address blocks.
            </p>
          </div>

          {!showCreate && !editingSite ? (
            <button type="button" onClick={() => setShowCreate(true)}>
              Add Site
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setShowCreate(false);
                setEditingSite(null);
              }}
            >
              Close Form
            </button>
          )}
        </div>
      </div>

      {showCreate || editingSite ? (
        <div className="panel">
          <SiteForm
            projectId={projectId}
            initialValues={editingSite}
            submitLabel={editingSite ? "Update site" : "Create site"}
            onCancel={() => {
              setShowCreate(false);
              setEditingSite(null);
            }}
            isSubmitting={isSubmitting}
            onSubmit={async (values) => {
              if (editingSite) {
                await updateSiteMutation.mutateAsync({ siteId: editingSite.id, values });
                setEditingSite(null);
                setShowCreate(false);
                return;
              }

              await createSiteMutation.mutateAsync(values);
              setShowCreate(false);
            }}
          />
        </div>
      ) : null}

      <div className="panel">
        {sitesQuery.isLoading ? (
          <p className="muted">Loading sites...</p>
        ) : (
          <SiteTable
            sites={sites}
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
