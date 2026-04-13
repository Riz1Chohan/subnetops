import type { Request, Response } from "express";
import { aiPlanPromptSchema, aiValidationExplainSchema } from "../validators/ai.schemas.js";
import { explainValidationFinding, generatePlanDraft } from "../services/ai.service.js";

export async function generateDraft(req: Request, res: Response) {
  const data = aiPlanPromptSchema.parse(req.body);
  const draft = await generatePlanDraft(data.prompt);
  res.json(draft);
}

export async function explainValidation(req: Request, res: Response) {
  const data = aiValidationExplainSchema.parse(req.body);
  const explanation = await explainValidationFinding(data);
  res.json(explanation);
}
