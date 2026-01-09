import { Router, Response } from 'express';
import { supabaseClient } from '../connections/supabaseClient.js';
import { authenticateRequest, type AuthenticatedRequest } from '../middleware/authenticateRequest.js';
import asyncHandler from './helpers/asyncHandler.js';

const router = Router();

const normalizeToken = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const normalizeOptionalText = (value: unknown) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
};

router.post('/', authenticateRequest, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const body = req.body || {};
    const token = normalizeToken(body.token);
    const deviceId = normalizeOptionalText(body.device_id ?? body.deviceId);
    const platform = normalizeOptionalText(body.platform);

    if (!token) {
        res.status(400).json({ error: 'token is required' });
        return;
    }

    const now = new Date().toISOString();
    const payload: Record<string, any> = {
        token,
        auth_user_id: req.authUserId ?? null,
        updated_at: now,
        last_seen_at: now,
        disabled_at: null,
        disable_reason: null,
    };

    if (deviceId !== undefined) payload.device_id = deviceId;
    if (platform !== undefined) payload.platform = platform;

    const { data, error } = await supabaseClient
        .from('push_tokens')
        .upsert(payload, { onConflict: 'token' })
        .select('*')
        .single();

    if (error) {
        throw new Error(`Failed to register push token: ${error.message}`);
    }

    res.json(data);
}));

router.delete('/', authenticateRequest, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const body = req.body || {};
    const token = normalizeToken(body.token);

    if (!token) {
        res.status(400).json({ error: 'token is required' });
        return;
    }

    const { error } = await supabaseClient
        .from('push_tokens')
        .delete()
        .eq('token', token)
        .eq('auth_user_id', req.authUserId ?? null);

    if (error) {
        throw new Error(`Failed to unregister push token: ${error.message}`);
    }

    res.json({ success: true });
}));

export default router;
