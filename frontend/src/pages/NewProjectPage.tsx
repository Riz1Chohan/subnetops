import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProjectForm } from "../features/projects/components/ProjectForm";
import { useOrganizations } from "../features/organizations/hooks";
import { useCreateProject } from "../features/projects/hooks";
import { AIPlanningPanel, type AIUseDraftOptions } from "../features/ai/components/AIPlanningPanel";
import type { AIPlanDraft, Site } from "../lib/types";
import { createSite } from "../features/sites/api";
import { createVlan } from "../features/vlans/api";
import { SectionHeader } from "../components/app/SectionHeader";

const defaultUseOptions: AIUseDraftOptions = {
  applyProjectFields: true,
  applySites: true,
  applyVlans: true,
};

function selectedSummary(options: AIUseDraftOptions) {
  const parts: string[] = [];
  if (options.applyProjectFields) parts.push("project fields");
  if (options.applySites) parts.push("sites");
  if (options.applyVlans) parts.push("VLANs");
  return parts.length > 0 ? parts.join(", ") : "nothing selected";
}

export function NewProjectPage() {
  const navigate = useNavigate();
  const mutation = useCreateProject();
  const orgsQuery = useOrganizations();
  const [aiDraft, setAiDraft] = useState<AIPlanDraft | null>(null);
  const [useOptions, setUseOptions] = useState<AIUseDraftOptions>(defaultUseOptions);
  const [generationStatus, setGenerationStatus] = useState<string>("");

  const initialValues = useMemo(() => {
    if (!aiDraft || !useOptions.applyProjectFields) return undefined;
    return {
      name: aiDraft.project.name,
      description: aiDraft.project.description,
      organizationName: aiDraft.project.organizationName,
      environmentType: aiDraft.project.environmentType,
      basePrivateRange: aiDraft.project.basePrivateRange,
    };
  }, [aiDraft, useOptions.applyProjectFields]);

  return (
    <section style={{ display: "grid", gap: 18 }}>
      <SectionHeader
        title="Create project"
        description="Start from a blank project form or let the AI assistant generate a safer first draft."
      />

      <AIPlanningPanel
        onUseDraft={(draft, options) => {
          setAiDraft(draft);
          setUseOptions(options);
          setGenerationStatus(`Draft applied from ${draft.provider}. Selected: ${selectedSummary(options)}.`);
        }}
      />

      <section className="panel">
        <div className="trust-note">
          <strong>How the AI works</strong>
          <p className="muted" style={{ margin: "6px 0 0 0" }}>
            The AI generates a first draft. You stay in control and can change every field before the project is saved.
          </p>
        </div>

        {generationStatus ? <p className="muted">{generationStatus}</p> : null}

        {aiDraft ? (
          <div className="panel" style={{ padding: 14, marginBottom: 16 }}>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Applied AI selections</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>Project fields: {useOptions.applyProjectFields ? "Yes" : "No"}</li>
              <li>Auto-create sites: {useOptions.applySites ? "Yes" : "No"}</li>
              <li>Auto-create VLANs: {useOptions.applyVlans ? "Yes" : "No"}</li>
            </ul>
          </div>
        ) : null}

        <ProjectForm
          initialValues={initialValues}
          organizations={orgsQuery.data ?? []}
          isSubmitting={mutation.isPending}
          onSubmit={async (values) => {
            const project = await mutation.mutateAsync(values);

            if (aiDraft && (useOptions.applySites || useOptions.applyVlans)) {
              const createdSitesByName = new Map<string, Site>();

              if (useOptions.applySites) {
                for (const siteDraft of aiDraft.sites) {
                  const site = await createSite({
                    projectId: project.id,
                    name: siteDraft.name,
                    location: siteDraft.location,
                    siteCode: siteDraft.siteCode,
                    defaultAddressBlock: siteDraft.defaultAddressBlock,
                    notes: siteDraft.notes,
                  });
                  createdSitesByName.set(siteDraft.name, site);
                }
              }

              if (useOptions.applyVlans) {
                for (const vlanDraft of aiDraft.vlans) {
                  const site = createdSitesByName.get(vlanDraft.siteName);
                  if (!site) continue;
                  await createVlan({
                    siteId: site.id,
                    vlanId: vlanDraft.vlanId,
                    vlanName: vlanDraft.vlanName,
                    purpose: vlanDraft.purpose,
                    subnetCidr: vlanDraft.subnetCidr,
                    gatewayIp: vlanDraft.gatewayIp,
                    dhcpEnabled: vlanDraft.dhcpEnabled,
                    estimatedHosts: vlanDraft.estimatedHosts,
                    department: vlanDraft.department,
                    notes: vlanDraft.notes,
                  });
                }
              }
            }

            navigate(`/projects/${project.id}/overview`);
          }}
        />
      </section>
    </section>
  );
}
