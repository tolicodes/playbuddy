import { NextFunction, Request, Response } from 'express';
import { supabaseClient } from '../connections/supabaseClient.js';
import { User } from '@supabase/supabase-js';

const getAuthUser = async (token: string) => {
    // Verify the token using Supabase Admin client
    const { data, error } = await supabaseClient.auth.getUser(token);

    if (error || !data) {
        throw Error('Invalid token')
    }

    return {
        authUserId: data.user.id,
        authUser: data.user
    }
}

export const authenticateRequest = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1]; // Extract the token from 'Bearer token'
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const { authUserId, authUser } = await getAuthUser(token);

        // Attach the user ID to the request object for use in the route handler
        req.authUserId = authUserId
        req.authUser = authUser;

        return next(); // Proceed to the next middleware or route handler
    } catch (error) {
        return res.status(500).json({ error: 'Failed to authenticate token' });
    }
};

export const optionalAuthenticateRequest = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1]; // Extract the token from 'Bearer token'
    if (!token) {
        return next();
    }

    try {
        const { authUserId, authUser } = await getAuthUser(token);

        // Attach the user ID to the request object for use in the route handler
        req.authUserId = authUserId
        req.authUser = authUser;

        return next(); // Proceed to the next middleware or route handler
    } catch (error) {
        return next();
    }
};

export interface AuthenticatedRequest extends Request {
    authUserId?: string; // This field will store the authenticated user's ID
    authUser?: User;
}