import { requireParam } from "../utils/request.js";
import { createVlanSchema, updateVlanSchema } from "../validators/vlan.schemas.js";
import * as vlanService from "../services/vlan.service.js";
import { ApiError } from "../utils/apiError.js";
export async function createVlan(req, res) {
    const userId = req.user?.id;
    const planTier = req.user?.planTier;
    if (!userId || !planTier)
        throw new ApiError(401, "Unauthorized");
    const data = createVlanSchema.parse(req.body);
    const vlan = await vlanService.createVlan(userId, planTier, data, req.user?.email);
    res.status(201).json(vlan);
}
export async function updateVlan(req, res) {
    const userId = req.user?.id;
    if (!userId)
        throw new ApiError(401, "Unauthorized");
    const data = updateVlanSchema.parse(req.body);
    const vlan = await vlanService.updateVlan(requireParam(req, "vlanId"), userId, data, req.user?.email);
    res.json(vlan);
}
export async function deleteVlan(req, res) {
    const userId = req.user?.id;
    if (!userId)
        throw new ApiError(401, "Unauthorized");
    await vlanService.deleteVlan(requireParam(req, "vlanId"), userId, req.user?.email);
    res.status(204).send();
}
