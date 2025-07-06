import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authenticateRequest.js'; // Adjust the import path to match your project
import { fetchAllRows } from '../helpers/fetchAllRows.js';

const router = Router();

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const allRows = await fetchAllRows({
            from: 'event_wishlist',
            select: `event_id,
                users:user_id (
                    user_id,
                    name,
                    avatar_url
                )`
        });


        // Group by event_id
        const grouped = Object.values(
            allRows.reduce((acc: any, row: any) => {
                if (!acc[row.event_id]) {
                    acc[row.event_id] = {
                        event_id: row.event_id,
                        attendees: [],
                    };
                }
                acc[row.event_id].attendees.push({
                    id: row.users.user_id,
                    name: row.users.name,
                    avatar_url: row.users.avatar_url,
                });
                return acc;
            }, {})
        );

        res.json(grouped);
    } catch (e) {
        console.error(`Error fetching attendees`, e)
        // @ts-ignore
        res.status(500).json({ error: `Error fetching attendees: ${e.message}` });
    }
})

export default router;