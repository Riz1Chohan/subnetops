import {
  buildAiDraftHelperControl,
  V1_AI_APPLIED_MARKER,
  V1_AI_AUTHORITY,
  V1_AI_DRAFT_HELPER_CONTRACT,
  V1_AI_DRAFT_ROLE,
} from "../../domain/ai/index.js";
import type { V1AiDraftHelperControlSummary } from "../designCore.types.js";

export { V1_AI_APPLIED_MARKER, V1_AI_AUTHORITY, V1_AI_DRAFT_HELPER_CONTRACT, V1_AI_DRAFT_ROLE };

export function buildV1AiDraftHelperControl(project: Parameters<typeof buildAiDraftHelperControl>[0]): V1AiDraftHelperControlSummary {
  return buildAiDraftHelperControl(project) as V1AiDraftHelperControlSummary;
}
