import { parseCidr } from '../addressing/cidr.js';
import type { RouteIntent } from './types.js';

export function routeIntentCoversDestination(routeIntent: RouteIntent, destinationCidr: string): boolean {
  try {
    const route = parseCidr(routeIntent.destinationCidr);
    const destination = parseCidr(destinationCidr);
    return destination.network >= route.network && destination.broadcast <= route.broadcast;
  } catch {
    return false;
  }
}

export function routeIntentNeedsReview(routeIntent: RouteIntent): boolean {
  return routeIntent.administrativeState === 'review' || routeIntent.nextHopType === 'engineer-review' || !routeIntent.nextHopObjectId;
}
