import type { SecurityServiceObject } from './types.js';

export function serviceIsBroad(service: Pick<SecurityServiceObject, 'name' | 'broadMatch'>): boolean {
  return service.broadMatch || ['any', 'all', '*'].includes(service.name.toLowerCase());
}

export function normalizeServiceName(value: string): string {
  return value.trim().toLowerCase() || 'unspecified';
}
