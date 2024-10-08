import { Request, Response, Router } from 'express';
import { supabaseClient } from '../connections/supabaseClient.js'; // Adjust the import path to match your project
import { AuthenticatedRequest, authenticateRequest } from '../middleware/authenticateRequest.js'; // Adjust the import path to match your project

const router = Router();


// Helper function to add an event to the wishlist
const saveWishlistEvent = async (eventId: string, userId: string) => {
    const { error } = await supabaseClient
        .from('event_wishlist')
        .insert([{ user_id: userId, event_id: eventId }]);

    if (error) {
        throw new Error(`Error saving event to wishlist: ${error.message}`);
    }
};

// Helper function to remove an event from the wishlist
const deleteWishlistEvent = async (eventId: string, userId: string) => {
    const { error } = await supabaseClient
        .from('event_wishlist')
        .delete()
        .eq('user_id', userId)
        .eq('event_id', eventId);

    if (error) {
        throw new Error(`Error deleting event from wishlist: ${error.message}`);
    }
};

// Function to handle fetching a friend's wishlist by share code
router.get('/friend/:shareCode', async (req: Request, res: Response) => {
    const { shareCode } = req.params;


    // Step 1: Fetch user based on the share code
    const { data: userData, error: userError } = await supabaseClient
        .from('users')
        .select('user_id')
        .eq('share_code', shareCode)
        .single();

    if (userError || !userData) {
        throw new Error(userError?.message || 'User not found');
    }

    const authUserId = userData.user_id;

    // Step 2: Fetch the wishlist for the given user ID
    const { data: wishlistData, error: wishlistError } = await supabaseClient
        .from('event_wishlist')
        .select('event_id')
        .eq('user_id', authUserId);

    if (wishlistError) {
        throw new Error(wishlistError.message);
    }

    if (!wishlistData) {
        throw new Error('Wishlist not found');
    }

    // Return the event IDs in the wishlist
    const friendWishlistEventIds = wishlistData.map((item: { event_id: string }) => item.event_id);
    return res.status(200).json(friendWishlistEventIds);
});

router.get('/', authenticateRequest, async (req: AuthenticatedRequest, res: Response) => {
    const { data, error } = await supabaseClient
        .from('event_wishlist')
        .select('event_id')
        .eq('user_id', req.authUserId)

    if (error) {
        throw new Error(`Error fetching wishlist: ${error.message}`);
    }

    const eventIds = data.map((wishlist_event: { event_id: string }) => wishlist_event.event_id);

    res.status(200).json(eventIds);
});



// POST /wishlist - Add an event to the wishlist
router.post('/:eventId', authenticateRequest, async (req: AuthenticatedRequest, res: Response) => {
    const { eventId } = req.params;
    if (!req.authUserId) throw new Error('Unauthorized')

    if (!eventId) {
        return res.status(400).json({ error: 'Event ID is required' });
    }

    await saveWishlistEvent(eventId, req.authUserId); // Use req.authUserId to save wishlist
    return res.status(201).json({ message: 'Event added to wishlist' });

});

// DELETE /wishlist/:eventId - Remove an event from the wishlist
router.delete('/:eventId', authenticateRequest, async (req: AuthenticatedRequest, res: Response) => {
    const { eventId } = req.params;
    if (!req.authUserId) throw new Error('Unauthorized')

    if (!eventId) {
        return res.status(400).json({ error: 'Event ID is required' });
    }

    await deleteWishlistEvent(eventId, req.authUserId); // Use req.authUserId to delete wishlist event
    return res.status(200).json({ message: 'Event removed from wishlist' });
});

export default router;