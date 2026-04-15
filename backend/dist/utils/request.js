import { ApiError } from "./apiError.js";
export function requireParam(req, key) {
    const value = req.params?.[key];
    if (typeof value === "string" && value.trim()) {
        return value;
    }
    throw new ApiError(400, `Missing route parameter: ${key}`);
}
