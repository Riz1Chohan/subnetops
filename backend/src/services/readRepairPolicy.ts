export type ReadRepairOperation =
  | "project-read"
  | "sites-read"
  | "vlans-read"
  | "design-core-read"
  | "validation-read"
  | "export-read"
  | "report-read";

export type ReadRepairPermissionMode =
  | "upstream-view-check"
  | "system-internal-authorized";

export type ReadRepairAuthorization = {
  permission: ReadRepairPermissionMode;
  userId?: string | null;
  checkedBy: string;
};

export type ReadRepairRowCounts = {
  sites: number;
  vlans: number;
  addressingRows: number;
  dhcpScopes: number;
  dhcpEnabledVlans: number;
};

export type ReadRepairPolicyDecision = {
  allowed: boolean;
  status: "NO_OP" | "ALLOW_REPAIR" | "BLOCK_REPAIR";
  action: "NO_OP" | "READ_REPAIR_MATERIALIZATION" | "BLOCKED_READ_REPAIR";
  reason: string;
  operation: ReadRepairOperation;
  authorization: ReadRepairAuthorization;
  requirementsPresent: boolean;
  materializationIncomplete: boolean;
};

export type ReadRepairObjectDelta = {
  sites: number;
  vlans: number;
  addressingRows: number;
  dhcpScopes: number;
};

export type ReadRepairEvidence = {
  action: "READ_REPAIR_MATERIALIZATION";
  projectId: string;
  operation: ReadRepairOperation;
  reason: string;
  authorizedBy: ReadRepairAuthorization;
  beforeState: ReadRepairRowCounts;
  afterState: ReadRepairRowCounts;
  createdObjects: ReadRepairObjectDelta;
  updatedObjects: ReadRepairObjectDelta;
  skippedObjects: ReadRepairObjectDelta;
  reviewRequiredObjects: number;
  blockedImplementationObjects: number;
  materializationStatus: "repaired" | "not-required";
  repairLogged: boolean;
  surfacedTo: string[];
};

const AUTHORIZED_READ_REPAIR_OPERATIONS: ReadRepairOperation[] = [
  "project-read",
  "sites-read",
  "vlans-read",
  "design-core-read",
  "validation-read",
  "export-read",
  "report-read",
];

export function isAuthorizedReadRepairOperation(value: unknown): value is ReadRepairOperation {
  return AUTHORIZED_READ_REPAIR_OPERATIONS.includes(value as ReadRepairOperation);
}

export function normalizeReadRepairOperation(value: unknown): ReadRepairOperation {
  const candidate = String(value ?? "").trim() as ReadRepairOperation;
  return isAuthorizedReadRepairOperation(candidate) ? candidate : "project-read";
}

export function buildReadRepairAuthorization(input: ReadRepairAuthorization): ReadRepairAuthorization {
  return {
    permission: input.permission,
    userId: input.userId ?? null,
    checkedBy: input.checkedBy,
  };
}

export function buildReadRepairPolicyDecision(input: {
  operation: ReadRepairOperation;
  authorization: ReadRepairAuthorization;
  requirementsPresent: boolean;
  materializationIncomplete: boolean;
}): ReadRepairPolicyDecision {
  const authorization = buildReadRepairAuthorization(input.authorization);
  if (!isAuthorizedReadRepairOperation(input.operation)) {
    return {
      allowed: false,
      status: "BLOCK_REPAIR",
      action: "BLOCKED_READ_REPAIR",
      reason: `Read-repair operation ${String(input.operation)} is not explicitly authorized.`,
      operation: input.operation,
      authorization,
      requirementsPresent: input.requirementsPresent,
      materializationIncomplete: input.materializationIncomplete,
    };
  }

  if (!authorization.checkedBy || !authorization.permission) {
    return {
      allowed: false,
      status: "BLOCK_REPAIR",
      action: "BLOCKED_READ_REPAIR",
      reason: "Read-repair requires an explicit permission check declaration.",
      operation: input.operation,
      authorization,
      requirementsPresent: input.requirementsPresent,
      materializationIncomplete: input.materializationIncomplete,
    };
  }

  if (!input.requirementsPresent) {
    return {
      allowed: false,
      status: "NO_OP",
      action: "NO_OP",
      reason: "No saved requirements exist, so read-repair is not applicable.",
      operation: input.operation,
      authorization,
      requirementsPresent: false,
      materializationIncomplete: input.materializationIncomplete,
    };
  }

  if (!input.materializationIncomplete) {
    return {
      allowed: false,
      status: "NO_OP",
      action: "NO_OP",
      reason: "Saved requirements are already materially represented by durable design rows.",
      operation: input.operation,
      authorization,
      requirementsPresent: true,
      materializationIncomplete: false,
    };
  }

  return {
    allowed: true,
    status: "ALLOW_REPAIR",
    action: "READ_REPAIR_MATERIALIZATION",
    reason: "Saved requirements exist and durable materialization is missing or incomplete.",
    operation: input.operation,
    authorization,
    requirementsPresent: true,
    materializationIncomplete: true,
  };
}

function positiveDelta(after: number, before: number) {
  return Math.max(0, after - before);
}

function zeroDelta(): ReadRepairObjectDelta {
  return { sites: 0, vlans: 0, addressingRows: 0, dhcpScopes: 0 };
}

export function buildReadRepairEvidence(input: {
  projectId: string;
  operation: ReadRepairOperation;
  reason: string;
  authorization: ReadRepairAuthorization;
  beforeState: ReadRepairRowCounts;
  afterState: ReadRepairRowCounts;
  repaired: boolean;
  repairLogged: boolean;
  reviewRequiredObjects?: number;
  blockedImplementationObjects?: number;
  materialization?: {
    createdSites?: number;
    updatedSites?: number;
    createdVlans?: number;
    updatedVlans?: number;
    createdDhcpScopes?: number;
    updatedDhcpScopes?: number;
    reviewRequiredObjects?: number;
    blockedImplementationObjects?: number;
  } | null;
  surfacedTo?: string[];
}): ReadRepairEvidence {
  const materialization = input.materialization ?? null;
  const createdObjects = input.repaired
    ? {
        sites: materialization?.createdSites ?? positiveDelta(input.afterState.sites, input.beforeState.sites),
        vlans: materialization?.createdVlans ?? positiveDelta(input.afterState.vlans, input.beforeState.vlans),
        addressingRows: positiveDelta(input.afterState.addressingRows, input.beforeState.addressingRows),
        dhcpScopes: materialization?.createdDhcpScopes ?? positiveDelta(input.afterState.dhcpScopes, input.beforeState.dhcpScopes),
      }
    : zeroDelta();
  const updatedObjects = input.repaired
    ? {
        sites: materialization?.updatedSites ?? 0,
        vlans: materialization?.updatedVlans ?? 0,
        addressingRows: 0,
        dhcpScopes: materialization?.updatedDhcpScopes ?? 0,
      }
    : zeroDelta();

  return {
    action: "READ_REPAIR_MATERIALIZATION",
    projectId: input.projectId,
    operation: input.operation,
    reason: input.reason,
    authorizedBy: buildReadRepairAuthorization(input.authorization),
    beforeState: input.beforeState,
    afterState: input.afterState,
    createdObjects,
    updatedObjects,
    skippedObjects: zeroDelta(),
    reviewRequiredObjects: input.reviewRequiredObjects ?? materialization?.reviewRequiredObjects ?? 0,
    blockedImplementationObjects: input.blockedImplementationObjects ?? materialization?.blockedImplementationObjects ?? 0,
    materializationStatus: input.repaired ? "repaired" : "not-required",
    repairLogged: input.repairLogged,
    surfacedTo: input.surfacedTo ?? ["service-response", "change-log", "security-audit"],
  };
}
