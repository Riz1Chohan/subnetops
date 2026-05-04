import type { RouteIntent } from './types.js';

export function staticRouteIntents(routeIntents: RouteIntent[]): RouteIntent[] {
  return routeIntents.filter((intent) => intent.routeKind === 'static');
}

export function hasStaticRouteTo(routeIntents: RouteIntent[], destinationCidr: string): boolean {
  return staticRouteIntents(routeIntents).some((intent) => intent.destinationCidr === destinationCidr);
}
