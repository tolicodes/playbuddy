import { NextFunction, Request, Response } from 'express';
import { supabaseClient } from '../connections/supabaseClient.js';
import { User } from '@supabase/supabase-js';

const getAuthUser = async (token: string) => {
    // Verify the token using Supabase Admin client
    const { data, error } = await supabaseClient.auth.getUser(token);

    if (error || !data) {
        console.error('Invalid token')
        return;
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
        const user = await getAuthUser(token);
        if (!user) {
            console.error('No user found');
            return next();
        }

        // Attach the user ID to the request object for use in the route handler
        req.authUserId = user.authUserId
        req.authUser = user.authUser;

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
        const user = await getAuthUser(token);
        if (!user) {
            console.error('No user found');
            return next();
        }

        // Attach the user ID to the request object for use in the route handler
        req.authUserId = user.authUserId
        req.authUser = user.authUser;

        return next(); // Proceed to the next middleware or route handler
    } catch (error) {
        console.log('error', error);
        return next();
    }
};

export interface AuthenticatedRequest extends Request {
    authUserId?: string; // This field will store the authenticated user's ID
    authUser?: User;
}