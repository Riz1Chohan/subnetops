import { useEffect, useState } from "react";
import type { Organization, Project } from "../../../lib/types";

interface ProjectFormProps {
  initialValues?: Partial<Project> | null;
  organizations?: Organization[];
  submitLabel?: string;
  onCancel?: () => void;
  onSubmit: (values: {
    name: string;
    description?: string;
    organizationName?: string;
    organizationId?: string;
    environmentType?: string;
    basePrivateRange?: string;
    logoUrl?: string;
    reportHeader?: string;
    reportFooter?: string;
    approvalStatus?: "DRAFT" | "IN_REVIEW" | "APPROVED";
    reviewerNotes?: string;
  }) => void | Promise<void>;
  isSubmitting?: boolean;
}

export function ProjectForm({ initialValues, organizations = [], submitLabel = "Create project", onCancel, onSubmit, isSubmitting }: ProjectFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [environmentType, setEnvironmentType] = useState("");
  const [basePrivateRange, setBasePrivateRange] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [reportHeader, setReportHeader] = useState("");
  const [reportFooter, setReportFooter] = useState("");
  const [approvalStatus, setApprovalStatus] = useState<"DRAFT" | "IN_REVIEW" | "APPROVED">("DRAFT");
  const [reviewerNotes, setReviewerNotes] = useState("");

  useEffect(() => {
    setName(initialValues?.name ?? "");
    setDescription(initialValues?.description ?? "");
    setOrganizationName(initialValues?.organizationName ?? "");
    setOrganizationId(initialValues?.organizationId ?? "");
    setEnvironmentType(initialValues?.environmentType ?? "");
    setBasePrivateRange(initialValues?.basePrivateRange ?? "");
    setLogoUrl(initialValues?.logoUrl ?? "");
    setReportHeader(initialValues?.reportHeader ?? "");
    setReportFooter(initialValues?.reportFooter ?? "");
    setApprovalStatus(initialValues?.approvalStatus ?? "DRAFT");
    setReviewerNotes(initialValues?.reviewerNotes ?? "");
  }, [initialValues]);

  return (
    <form onSubmit={(e) => { e.preventDefault(); void onSubmit({ name, description, organizationName, organizationId, environmentType, basePrivateRange, logoUrl, reportHeader, reportFooter, approvalStatus, reviewerNotes }); }} style={{ display: "grid", gap: 12, maxWidth: 640 }}>
      <input placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} required />
      <input placeholder="Organization label" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} />
      <select value={organizationId} onChange={(e) => setOrganizationId(e.target.value)}>
        <option value="">No linked organization</option>
        {organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
      </select>
      <input placeholder="Environment type" value={environmentType} onChange={(e) => setEnvironmentType(e.target.value)} />
      <input placeholder="Base private range (e.g. 10.10.0.0/16)" value={basePrivateRange} onChange={(e) => setBasePrivateRange(e.target.value)} />
      <input placeholder="Logo image URL (optional)" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
      <input placeholder="Report header (optional)" value={reportHeader} onChange={(e) => setReportHeader(e.target.value)} />
      <input placeholder="Report footer (optional)" value={reportFooter} onChange={(e) => setReportFooter(e.target.value)} />
      <select value={approvalStatus} onChange={(e) => setApprovalStatus(e.target.value as "DRAFT" | "IN_REVIEW" | "APPROVED") }>
        <option value="DRAFT">Draft</option>
        <option value="IN_REVIEW">In Review</option>
        <option value="APPROVED">Approved</option>
      </select>
      <textarea placeholder="Reviewer notes (optional)" value={reviewerNotes} onChange={(e) => setReviewerNotes(e.target.value)} rows={4} />
      <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
      <div className="form-actions">
        <button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : submitLabel}</button>
        {onCancel ? <button type="button" onClick={onCancel}>Cancel</button> : null}
      </div>
    </form>
  );
}
