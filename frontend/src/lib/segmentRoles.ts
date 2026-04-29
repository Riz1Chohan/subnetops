/**
 * Type-only segment role definitions used by frontend display components.
 *
 * Authoritative role classification, subnet math, gateway policy, and
 * allocation logic live in the backend design-core. Do not add browser-side
 * role inference or allocator helpers here.
 */
export type SegmentRole =
  | "USER"
  | "GUEST"
  | "SERVER"
  | "MANAGEMENT"
  | "VOICE"
  | "PRINTER"
  | "IOT"
  | "CAMERA"
  | "DMZ"
  | "WAN_TRANSIT"
  | "LOOPBACK"
  | "OTHER";

export function segmentRoleLabel(role?: SegmentRole | string | null) {
  return role ? String(role).replace(/_/g, " ") : "—";
}
