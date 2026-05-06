import { api } from "../../lib/api";
import type { Site } from "../../lib/types";

export function createSite(input: {
  projectId: string;
  name: string;
  location?: string;
  streetAddress?: string;
  siteCode?: string;
  notes?: string;
  defaultAddressBlock?: string;
}) {
  return api<Site>("/sites", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateSite(siteId: string, input: {
  name?: string;
  location?: string;
  streetAddress?: string;
  siteCode?: string;
  notes?: string;
  defaultAddressBlock?: string;
}) {
  return api<Site>(`/sites/${siteId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteSite(siteId: string) {
  return api<void>(`/sites/${siteId}`, {
    method: "DELETE",
  });
}
