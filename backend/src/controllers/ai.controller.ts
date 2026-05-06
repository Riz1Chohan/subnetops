import type { Request, Response } from "express";
import { aiPlanPromptSchema, aiValidationExplainSchema } from "../validators/ai.schemas.js";
import { explainValidationFinding, generatePlanDraft } from "../services/ai.service.js";
import { recordSecurityAuditEvent } from "../services/securityAudit.service.js";

export async function generateDraft(req: Request, res: Response) {
  const data = aiPlanPromptSchema.parse(req.body);
  await recordSecurityAuditEvent({ action: "ai.request", outcome: "created", actorUserId: req.user?.id || null, targetType: "ai", detail: { mode: "plan-draft", promptLength: data.prompt.length } });
  const draft = await generatePlanDraft(data.prompt);
  res.json(draft);
}

export async function explainValidation(req: Request, res: Response) {
  const data = aiValidationExplainSchema.parse(req.body);
  await recordSecurityAuditEvent({ action: "ai.request", outcome: "created", actorUserId: req.user?.id || null, targetType: "ai", detail: { mode: "explain-validation" } });
  const explanation = await explainValidationFinding(data);
  res.json(explanation);
}
