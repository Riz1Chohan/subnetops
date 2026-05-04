import { z } from "zod";
import {
  canonicalCidr,
  classifySegmentRole,
  isValidIpv4,
  parseCidr,
  validateGatewayForSubnet,
  type SegmentRole,
} from "../domain/addressing/cidr.js";

const SEGMENT_ROLES: readonly SegmentRole[] = ["USER", "SERVER", "GUEST", "MANAGEMENT", "DMZ", "VOICE", "PRINTER", "IOT", "CAMERA", "WAN_TRANSIT", "LOOPBACK", "OTHER"] as const;

type VlanAddressingCandidate = {
  subnetCidr?: unknown;
  gatewayIp?: unknown;
  segmentRole?: unknown;
  vlanName?: unknown;
  purpose?: unknown;
  department?: unknown;
  notes?: unknown;
};

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function roleFromCandidate(candidate: VlanAddressingCandidate): SegmentRole {
  const explicitRole = clean(candidate.segmentRole).toUpperCase().replace(/[\s-]+/g, "_");
  if ((SEGMENT_ROLES as readonly string[]).includes(explicitRole)) return explicitRole as SegmentRole;
  if (explicitRole === "USERS") return "USER";
  if (explicitRole === "SERVERS") return "SERVER";
  if (explicitRole === "MGMT") return "MANAGEMENT";
  if (explicitRole === "TRANSIT") return "WAN_TRANSIT";
  return classifySegmentRole([candidate.purpose, candidate.vlanName, candidate.department, candidate.notes].map(clean).join(" "));
}

export function collectSiteAddressBlockValidationMessages(defaultAddressBlock: unknown): string[] {
  const value = clean(defaultAddressBlock);
  if (!value) return [];
  try {
    parseCidr(value);
    return [];
  } catch {
    return ["Default address block must be valid IPv4 CIDR notation, for example 10.10.0.0/20."];
  }
}

export function collectVlanAddressingValidationMessages(candidate: VlanAddressingCandidate): string[] {
  const messages: string[] = [];
  const subnetCidr = clean(candidate.subnetCidr);
  const gatewayIp = clean(candidate.gatewayIp);
  const role = roleFromCandidate(candidate);

  if (!subnetCidr && !gatewayIp) return messages;

  let parsedCidr: ReturnType<typeof parseCidr> | null = null;
  if (subnetCidr) {
    try {
      parsedCidr = parseCidr(subnetCidr);
    } catch {
      messages.push("Subnet must be valid IPv4 CIDR notation, for example 10.20.30.0/24.");
    }
  }

  if (gatewayIp && !isValidIpv4(gatewayIp)) {
    messages.push("Gateway must be valid IPv4 notation with no leading-zero octets.");
    return messages;
  }

  if (!parsedCidr || !gatewayIp) return messages;

  const gatewayValidation = validateGatewayForSubnet(parsedCidr, gatewayIp, role);
  if (!gatewayValidation.usable) {
    messages.push(`${gatewayValidation.explanation} Gateway must be a role-usable host inside ${gatewayValidation.canonicalCidr}.`);
  }

  const canonical = canonicalCidr(subnetCidr);
  if (subnetCidr !== canonical) {
    messages.push(`Subnet must be stored on its network boundary: ${canonical}.`);
  }

  return messages;
}

export function addSiteAddressBlockValidation(ctx: z.RefinementCtx, defaultAddressBlock: unknown, path: Array<string | number> = ["defaultAddressBlock"]): void {
  for (const message of collectSiteAddressBlockValidationMessages(defaultAddressBlock)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
  }
}

export function addVlanAddressingValidation(ctx: z.RefinementCtx, candidate: VlanAddressingCandidate): void {
  const messages = collectVlanAddressingValidationMessages(candidate);
  for (const message of messages) {
    const path = message.startsWith("Subnet") ? ["subnetCidr"] : ["gatewayIp"];
    ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
  }
}
