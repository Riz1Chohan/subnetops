import type { PolicyRule } from './types.js';

export function policyRuleIsBroadPermit(rule: PolicyRule): boolean {
  return rule.action === 'allow' && rule.services.some((service) => ['any', 'all', '*'].includes(service.toLowerCase()));
}

export function policyRuleRequiresReview(rule: PolicyRule): boolean {
  return rule.action === 'review' || rule.truthState === 'review-required' || policyRuleIsBroadPermit(rule);
}
