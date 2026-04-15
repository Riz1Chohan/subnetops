import { z } from "zod";
export const aiPlanPromptSchema = z.object({
    prompt: z.string().min(10).max(4000),
});
export const aiValidationExplainSchema = z.object({
    title: z.string().min(1).max(300),
    message: z.string().min(1).max(4000),
    severity: z.enum(["ERROR", "WARNING", "INFO"]),
    entityType: z.enum(["PROJECT", "SITE", "VLAN"]),
});
