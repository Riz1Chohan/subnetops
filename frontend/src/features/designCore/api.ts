import { api } from "../../lib/api";
import type { DesignCoreSnapshot } from "../../lib/designCoreSnapshot";

export function getDesignCoreSnapshot(projectId: string) {
  return api<DesignCoreSnapshot>(`/design-core/projects/${projectId}`);
}
