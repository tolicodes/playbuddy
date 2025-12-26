import { NextFunction, Request, Response, RequestHandler } from 'express';

// Wrap an async handler so errors propagate to Express error middleware.
export const asyncHandler = (fn: RequestHandler) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
