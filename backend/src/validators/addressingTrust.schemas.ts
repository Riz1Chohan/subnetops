import { z } from "zod";
import {
  collectAddressingMessages,
  validateSiteAddressBlock,
  validateVlanAddressing,
  type VlanAddressingCandidate,
} from "../domain/addressing/addressing-validation.js";

export function collectSiteAddressBlockValidationMessages(defaultAddressBlock: unknown): string[] {
  return collectAddressingMessages(validateSiteAddressBlock(defaultAddressBlock));
}

export function collectVlanAddressingValidationMessages(candidate: VlanAddressingCandidate): string[] {
  return collectAddressingMessages(validateVlanAddressing(candidate));
}

export function addSiteAddressBlockValidation(ctx: z.RefinementCtx, defaultAddressBlock: unknown, path: Array<string | number> = ["defaultAddressBlock"]): void {
  for (const message of collectSiteAddressBlockValidationMessages(defaultAddressBlock)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
  }
}

export function addVlanAddressingValidation(ctx: z.RefinementCtx, candidate: VlanAddressingCandidate): void {
  const validation = validateVlanAddressing(candidate);
  for (const validationIssue of validation.issues.filter((item) => item.severity === "ERROR")) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: [validationIssue.field], message: validationIssue.message });
  }
}
