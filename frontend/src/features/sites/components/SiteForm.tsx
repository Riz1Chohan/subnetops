import { useEffect, useMemo, useState } from "react";
import { isValidCidr } from "../../../lib/networkValidators";
import type { Site } from "../../../lib/types";

interface SiteFormProps {
  projectId: string;
  initialValues?: Partial<Site> | null;
  submitLabel?: string;
  onCancel?: () => void;
  onSubmit: (values: {
    projectId: string;
    name: string;
    location?: string;
    streetAddress?: string;
    buildingLabel?: string;
    floorLabel?: string;
    siteCode?: string;
    notes?: string;
    defaultAddressBlock?: string;
  }) => void | Promise<void>;
  isSubmitting?: boolean;
}

export function SiteForm({
  projectId,
  initialValues,
  submitLabel = "Create site",
  onCancel,
  onSubmit,
  isSubmitting,
}: SiteFormProps) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [buildingLabel, setBuildingLabel] = useState("");
  const [floorLabel, setFloorLabel] = useState("");
  const [siteCode, setSiteCode] = useState("");
  const [defaultAddressBlock, setDefaultAddressBlock] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setName(initialValues?.name ?? "");
    setLocation(initialValues?.location ?? "");
    setStreetAddress(initialValues?.streetAddress ?? "");
    setBuildingLabel((initialValues as any)?.buildingLabel ?? "");
    setFloorLabel((initialValues as any)?.floorLabel ?? "");
    setSiteCode(initialValues?.siteCode ?? "");
    setDefaultAddressBlock(initialValues?.defaultAddressBlock ?? "");
    setNotes(initialValues?.notes ?? "");
  }, [initialValues]);

  const error = useMemo(() => {
    if (!name.trim()) return "Site name is required.";
    if (defaultAddressBlock && !isValidCidr(defaultAddressBlock)) return "Default address block must be valid CIDR format.";
    return "";
  }, [name, defaultAddressBlock]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (error) return;
        void onSubmit({ projectId, name: name.trim(), location, streetAddress, buildingLabel, floorLabel, siteCode, defaultAddressBlock, notes });
        if (!initialValues?.id) {
          setName("");
          setLocation("");
          setStreetAddress("");
          setBuildingLabel("");
          setFloorLabel("");
          setSiteCode("");
          setDefaultAddressBlock("");
          setNotes("");
        }
      }}
      className="panel"
    >
      <h3 style={{ margin: 0 }}>{initialValues?.id ? "Edit site" : "Add site"}</h3>
      <input placeholder="Site name" value={name} onChange={(e) => setName(e.target.value)} required />
      <input placeholder="Location name / city" value={location} onChange={(e) => setLocation(e.target.value)} />
      <input placeholder="Street address (optional)" value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} />
      <input placeholder="Building label (optional)" value={buildingLabel} onChange={(e) => setBuildingLabel(e.target.value)} />
      <input placeholder="Floor label (optional)" value={floorLabel} onChange={(e) => setFloorLabel(e.target.value)} />
      <input placeholder="Site code" value={siteCode} onChange={(e) => setSiteCode(e.target.value)} />
      <input placeholder="Default address block" value={defaultAddressBlock} onChange={(e) => setDefaultAddressBlock(e.target.value)} />
      <textarea placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      {error ? <p className="error-text">{error}</p> : null}
      <div className="form-actions">
        <button type="submit" disabled={isSubmitting || Boolean(error)}>{isSubmitting ? "Saving..." : submitLabel}</button>
        {onCancel ? <button type="button" onClick={onCancel}>Cancel</button> : null}
      </div>
    </form>
  );
}
