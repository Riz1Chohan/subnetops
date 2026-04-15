import { ZodError } from "zod";
import { ApiError } from "../utils/apiError.js";
export function errorHandler(err, _req, res, _next) {
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({ message: err.message });
    }
    if (err instanceof ZodError) {
        const first = err.issues[0];
        const message = first ? `${first.path.length ? `${first.path.join(".")}: ` : ""}${first.message}` : "Validation failed";
        return res.status(400).json({ message });
    }
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
}
