import type { NatRule } from './types.js';

export function natRuleIsRequired(rule: NatRule): boolean {
  return rule.status === 'required' && rule.translatedAddressMode !== 'not-required';
}

export function natRuleIsComplete(rule: NatRule): boolean {
  return natRuleIsRequired(rule) && ['interface-overload', 'static', 'pool'].includes(rule.translatedAddressMode);
}
