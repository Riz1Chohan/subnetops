import {
  buildV1FinalProofPassControl as buildProofSummary,
  V1_FINAL_CROSS_ENGINE_PROOF_CONTRACT,
  V1_PROOF_ROLE,
  V1_RELEASE_TARGET,
  type V1ProofContext,
} from "../../domain/proof/index.js";
import type { V1FinalProofPassControlSummary } from "../designCore.types.js";

export { V1_FINAL_CROSS_ENGINE_PROOF_CONTRACT, V1_PROOF_ROLE, V1_RELEASE_TARGET };

export function buildV1FinalProofPassControl(context: V1ProofContext): V1FinalProofPassControlSummary {
  return buildProofSummary(context) as V1FinalProofPassControlSummary;
}
