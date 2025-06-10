import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authenticateRequest.js';
declare const router: import("express-serve-static-core").Router;
export declare const fetchMyCommunities: (req: AuthenticatedRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const joinCommunity: (req: AuthenticatedRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const leaveCommunity: (req: AuthenticatedRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const fetchPublicCommunities: (req: Request, res: Response) => Promise<void>;
export default router;
//# sourceMappingURL=communities.d.ts.map