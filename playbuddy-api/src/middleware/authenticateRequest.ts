import { NextFunction, Request, Response } from 'express';
import { supabaseClient } from '../connections/supabaseClient.js';

// Middleware to authenticate request
export const authenticateRequest = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1]; // Extract the token from 'Bearer token'
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        // Verify the token using Supabase Admin client
        const { data, error } = await supabaseClient.auth.getUser(token);

        if (error || !data) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        // Attach the user ID to the request object for use in the route handler
        req.authUserId = data.user.id;

        const { data: userData, error: userError } = await supabaseClient
            .from('users')
            .select('id') // Select only the relevant `id` field from custom `users` table
            .eq('user_id', req.authUserId)
            .single();

        if (userError || !userData) {
            return res.status(400).json({ error: 'User not found in custom users table' });
        }

        req.userId = userData.id;

        return next(); // Proceed to the next middleware or route handler
    } catch (error) {
        return res.status(500).json({ error: 'Failed to authenticate token' });
    }
};

export const optionalAuthenticateRequest = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1]; // Extract the token from 'Bearer token'
    if (!token) {
        return next(); // No token, continue without authentication
    }

    try {
        // Verify the token using Supabase Admin client
        const { data, error } = await supabaseClient.auth.getUser(token);

        if (error || !data) {
            return next(); // Invalid token, continue without authentication
        }

        // Attach the user ID to the request object for use in the route handler
        req.authUserId = data.user.id;

        const { data: userData, error: userError } = await supabaseClient
            .from('users')
            .select('id') // Select only the relevant `id` field from custom `users` table
            .eq('user_id', req.authUserId)
            .single();

        if (userError || !userData) {
            return next(); // User not found in custom users table, continue without authentication
        }

        req.userId = userData.id;

        return next(); // Proceed to the next middleware or route handler
    } catch (error) {
        return next(); // On error, continue without authentication
    }
};



export interface AuthenticatedRequest extends Request {
    authUserId?: string; // This field will store the authenticated user's ID
    userId?: string;     // This field will store the custom user ID from your `users` table
}