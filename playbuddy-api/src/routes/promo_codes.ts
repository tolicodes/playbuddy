import { Router, Request, Response } from 'express';
import { supabaseClient } from '../connections/supabaseClient.js'; // Adjust the import path to match your project
import { authenticateAdminRequest, AuthenticatedRequest } from '../middleware/authenticateRequest.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
    const { data, error } = await supabaseClient
        .from('promo_codes')
        .select(`*`)


    if (error) {
        console.error(`Error fetching promo codes`, error);
        throw error;
    }


    res.json(data);

});

router.post('/', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    const { promo_code } = req.body;
    const { data, error } = await supabaseClient.from('promo_codes').insert({ promo_code });
    res.json(data);
});

router.put('/:id', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { promo_code } = req.body;
    const { data, error } = await supabaseClient.from('promo_codes').update({ promo_code }).eq('id', id);
    res.json(data);
});

router.delete('/:id', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { data, error } = await supabaseClient.from('promo_codes').delete().eq('id', id);
    res.json(data);
});

export default router;