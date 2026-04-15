import { requireParam } from "../utils/request.js";
import { ApiError } from "../utils/apiError.js";
import * as service from "../services/projectWatch.service.js";
export async function listWatchers(req, res) {
    const userId = req.user?.id;
    if (!userId)
        throw new ApiError(401, "Unauthorized");
    res.json(await service.listWatchers(requireParam(req, "projectId"), userId));
}
export async function watchProject(req, res) {
    const userId = req.user?.id;
    if (!userId)
        throw new ApiError(401, "Unauthorized");
    res.status(201).json(await service.watchProject(requireParam(req, "projectId"), userId));
}
export async function unwatchProject(req, res) {
    const userId = req.user?.id;
    if (!userId)
        throw new ApiError(401, "Unauthorized");
    await service.unwatchProject(requireParam(req, "projectId"), userId);
    res.status(204).send();
}
