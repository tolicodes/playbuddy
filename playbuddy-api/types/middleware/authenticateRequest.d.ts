import { NextFunction, Request, Response } from 'express';
import { User } from '@supabase/supabase-js';
export declare const authenticateRequest: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare const optionalAuthenticateRequest: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const authenticateAdminRequest: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export interface AuthenticatedRequest extends Request {
    authUserId?: string;
    authUser?: User;
}
//# sourceMappingURL=authenticateRequest.d.ts.map