import type { NextFunction, Request, Response } from "express";

export function asyncHandler(
  routeHandler: (request: Request, response: Response, next: NextFunction) => Promise<unknown>,
) {
  return (request: Request, response: Response, next: NextFunction) => {
    void routeHandler(request, response, next).catch(next);
  };
}
