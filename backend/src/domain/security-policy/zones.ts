import type { SecurityZone } from './types.js';

export function zoneIsHighRiskSource(zone: SecurityZone): boolean {
  return ['guest', 'wan', 'dmz', 'iot'].includes(zone.zoneRole);
}

export function zoneIsHighValueDestination(zone: SecurityZone): boolean {
  return ['internal', 'management'].includes(zone.zoneRole);
}

export function defaultZonePosture(sourceZone: SecurityZone, destinationZone: SecurityZone): 'allow' | 'deny' | 'review' {
  if (sourceZone.id === destinationZone.id) return sourceZone.isolationExpectation === 'isolated' ? 'review' : 'allow';
  if (zoneIsHighRiskSource(sourceZone) && zoneIsHighValueDestination(destinationZone)) return 'deny';
  return destinationZone.isolationExpectation === 'review' ? 'review' : 'deny';
}
