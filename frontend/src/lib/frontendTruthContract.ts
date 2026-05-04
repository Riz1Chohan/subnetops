export type FrontendEngineeringFactState =
  | "user_provided"
  | "system_calculated"
  | "system_verified"
  | "requires_review"
  | "not_available"
  | "not_supported_yet";

export interface FrontendTruthContractSummary {
  authorityMode: "backend_snapshot" | "backend_unavailable";
  mayDisplayFacts: boolean;
  mayTransformForDisplay: boolean;
  mayInventEngineeringFacts: false;
  allowedStates: FrontendEngineeringFactState[];
  blockedFactTypes: string[];
  unavailableMessage: string;
}

const ALLOWED_STATES: FrontendEngineeringFactState[] = [
  "user_provided",
  "system_calculated",
  "system_verified",
  "requires_review",
  "not_available",
  "not_supported_yet",
];

const BLOCKED_FACT_TYPES = [
  "subnets",
  "VLANs",
  "routes",
  "firewall zones",
  "security policies",
  "gateways",
  "readiness statuses",
  "implementation plans",
  "report claims",
  "topology relationships",
];

export function frontendTruthContract(hasBackendSnapshot: boolean): FrontendTruthContractSummary {
  return {
    authorityMode: hasBackendSnapshot ? "backend_snapshot" : "backend_unavailable",
    mayDisplayFacts: hasBackendSnapshot,
    mayTransformForDisplay: true,
    mayInventEngineeringFacts: false,
    allowedStates: ALLOWED_STATES,
    blockedFactTypes: BLOCKED_FACT_TYPES,
    unavailableMessage: hasBackendSnapshot
      ? "Backend design snapshot is loaded. The frontend may display and format returned facts only."
      : "Backend design snapshot is unavailable. The frontend must show empty, review, or not-available states instead of generating a replacement design.",
  };
}

export function isDisplayOnlyFactState(state: string): state is FrontendEngineeringFactState {
  return (ALLOWED_STATES as string[]).includes(state);
}
