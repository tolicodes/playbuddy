import type { Request, Response } from 'express';

const LARGE_PROCESS_GROUP = process.env.FLY_LARGE_PROCESS_GROUP ?? 'large';

export const replayToLargeInstance = (req: Request, res: Response): boolean => {
    if (!process.env.FLY_APP_NAME) return false;
    const replayHeader = req.headers['fly-replay'] ?? req.headers['fly-replay-src'];
    if (replayHeader) return false;
    if (process.env.FLY_PROCESS_GROUP === LARGE_PROCESS_GROUP) return false;

    res.set('Fly-Replay', `group=${LARGE_PROCESS_GROUP}`);
    res.status(409).json({ error: 'Replaying request on large instance.' });
    return true;
};
