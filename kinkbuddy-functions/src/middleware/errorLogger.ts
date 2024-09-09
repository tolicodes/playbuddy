import { Request, Response, NextFunction } from 'express';

// Error logging middleware
export const errorLogger = (err: any, req: Request, res: Response, next: NextFunction) => {
    // Log the error details
    console.error(`
        Error occurred:
        - Path: ${req.path}
        - Method: ${req.method}
        - Status: ${res.statusCode || 500}
        - Message: ${err.message}
    `);

    // You can also log more details like headers, body, etc.
    // console.error(`Headers: ${JSON.stringify(req.headers)}`);
    // console.error(`Body: ${JSON.stringify(req.body)}`);

    // Pass the error to the next middleware or the default error handler
    next(err);
};