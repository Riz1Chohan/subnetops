import type { RouteIntent } from './types.js';

export function isDefaultRouteIntent(routeIntent: RouteIntent): boolean {
  return routeIntent.routeKind === 'default' && routeIntent.destinationCidr === '0.0.0.0/0';
}

export function defaultRouteReadiness(routeIntents: RouteIntent[]): 'ready' | 'review' | 'blocked' {
  const defaults = routeIntents.filter(isDefaultRouteIntent);
  if (defaults.length === 0) return 'review';
  if (defaults.some((intent) => intent.administrativeState === 'missing')) return 'blocked';
  if (defaults.some((intent) => intent.administrativeState === 'review')) return 'review';
  return 'ready';
}
