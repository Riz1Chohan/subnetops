import { requireParam } from "../utils/request.js";
import * as validationService from "../services/validation.service.js";
export async function runValidation(req, res) {
    const results = await validationService.runValidation(requireParam(req, "projectId"));
    res.json(results);
}
export async function getValidationResults(req, res) {
    const results = await validationService.getValidationResults(requireParam(req, "projectId"));
    res.json(results);
}
