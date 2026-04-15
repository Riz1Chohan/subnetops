import { requireParam } from "../utils/request.js";
import { createProjectSchema, updateProjectSchema } from "../validators/project.schemas.js";
import * as projectService from "../services/project.service.js";
import { ApiError } from "../utils/apiError.js";
export async function listProjects(req, res) {
    const userId = req.user?.id;
    if (!userId)
        throw new ApiError(401, "Unauthorized");
    const projects = await projectService.listProjects(userId);
    res.json(projects);
}
export async function createProject(req, res) {
    const userId = req.user?.id;
    const planTier = req.user?.planTier;
    if (!userId || !planTier)
        throw new ApiError(401, "Unauthorized");
    const data = createProjectSchema.parse(req.body);
    const project = await projectService.createProject(userId, planTier, data, req.user?.email);
    res.status(201).json(project);
}
export async function createProjectFromTemplate(req, res) {
    const userId = req.user?.id;
    const planTier = req.user?.planTier;
    if (!userId || !planTier)
        throw new ApiError(401, "Unauthorized");
    const project = await projectService.createProjectFromTemplate(userId, planTier, requireParam(req, "templateKey"), req.body?.name, req.user?.email);
    res.status(201).json(project);
}
export async function duplicateProject(req, res) {
    const userId = req.user?.id;
    const planTier = req.user?.planTier;
    if (!userId || !planTier)
        throw new ApiError(401, "Unauthorized");
    const project = await projectService.duplicateProject(userId, planTier, requireParam(req, "projectId"), req.user?.email);
    res.status(201).json(project);
}
export async function getProject(req, res) {
    const userId = req.user?.id;
    if (!userId)
        throw new ApiError(401, "Unauthorized");
    const project = await projectService.getProject(requireParam(req, "projectId"), userId);
    if (!project)
        throw new ApiError(404, "Project not found");
    res.json(project);
}
export async function getProjectSites(req, res) {
    const userId = req.user?.id;
    if (!userId)
        throw new ApiError(401, "Unauthorized");
    const sites = await projectService.getProjectSites(requireParam(req, "projectId"), userId);
    res.json(sites);
}
export async function getProjectVlans(req, res) {
    const userId = req.user?.id;
    if (!userId)
        throw new ApiError(401, "Unauthorized");
    const vlans = await projectService.getProjectVlans(requireParam(req, "projectId"), userId);
    res.json(vlans);
}
export async function updateProject(req, res) {
    const userId = req.user?.id;
    if (!userId)
        throw new ApiError(401, "Unauthorized");
    const data = updateProjectSchema.parse(req.body);
    await projectService.updateProject(requireParam(req, "projectId"), userId, data, req.user?.email);
    res.json({ message: "Project updated" });
}
export async function deleteProject(req, res) {
    const userId = req.user?.id;
    if (!userId)
        throw new ApiError(401, "Unauthorized");
    await projectService.deleteProject(requireParam(req, "projectId"), userId);
    res.status(204).send();
}
