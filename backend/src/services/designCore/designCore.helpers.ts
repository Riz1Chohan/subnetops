import {
  describeSubnet,
  intToIpv4,
  parseCidr,
  type ParsedCidr,
  type SegmentRole,
} from "../../lib/cidr.js";
import { chooseGatewayForSubnet } from "../../lib/addressAllocator.js";
import type { DesignCoreAddressRow, DesignCoreIssue } from "../designCore.types.js";

type JsonMap = Record<string, unknown>;

export function parseJsonMap(value?: string | null): JsonMap {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? (parsed as JsonMap) : {};
  } catch {
    return {};
  }
}

export function valueAsString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((item) => valueAsString(item)).filter(Boolean).join(", ");
  return "";
}

export function valueAsBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return ["true", "yes", "y", "1", "enabled", "on"].includes(normalized);
  }
  return false;
}

export function hasMeaningfulValue(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) && value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized.length > 0 && !["no", "none", "n/a", "na", "false", "0", "unknown", "not sure"].includes(normalized);
  }
  if (Array.isArray(value)) return value.some((item) => hasMeaningfulValue(item));
  return false;
}

export function isPrivateIpv4Cidr(value?: string | null): boolean {
  if (!value) return false;
  try {
    const parsed = parseCidr(value);
    const octets = intToIpv4(parsed.network).split(".").map((part) => Number(part));
    const [firstOctet, secondOctet] = octets;
    return firstOctet === 10
      || (firstOctet === 172 && secondOctet >= 16 && secondOctet <= 31)
      || (firstOctet === 192 && secondOctet === 168);
  } catch {
    return false;
  }
}

export function pushIssue(target: DesignCoreIssue[], issue: DesignCoreIssue) {
  target.push(issue);
}

export function rangeSummary(parsed: ParsedCidr) {
  const detail = describeSubnet(parsed);
  return `${detail.networkAddress} - ${detail.broadcastAddress}`;
}

export function classifyGatewayConvention(parsed: ParsedCidr, gatewayIp: string, role: SegmentRole): DesignCoreAddressRow["gatewayConvention"] {
  if (role === "LOOPBACK" || role === "WAN_TRANSIT") return "not-applicable";
  const detail = describeSubnet(parsed, role);
  if (detail.firstUsableIp === gatewayIp) return "first-usable";
  if (detail.lastUsableIp === gatewayIp) return "last-usable";
  return "custom";
}

export function defaultGatewayForSubnet(
  parsed: ParsedCidr,
  role: SegmentRole,
  preferredConvention: "first-usable" | "last-usable" = "first-usable",
): string | undefined {
  return chooseGatewayForSubnet(parsed, role, preferredConvention);
}

export function findCoveringSummaryPrefix(rangeStart: number, rangeEnd: number): number {
  for (let prefix = 32; prefix >= 0; prefix -= 1) {
    const candidate = parseCidr(`${intToIpv4(rangeStart)}/${prefix}`);
    if (candidate.network <= rangeStart && candidate.broadcast >= rangeEnd) {
      return prefix;
    }
  }
  return 0;
}
