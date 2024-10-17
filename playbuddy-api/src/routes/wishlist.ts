import { Request, Response, Router } from 'express';
import { supabaseClient } from '../connections/supabaseClient.js'; // Adjust the import path to match your project
import { AuthenticatedRequest, authenticateRequest } from '../middleware/authenticateRequest.js'; // Adjust the import path to match your project

const router = Router();

// GET /wishlist/friend/:shareCode - Fetch a friend's wishlist by share code
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

// GET /wishlist/buddies - View all events in buddies' wishlists
router.get('/buddies', authenticateRequest, async (req: AuthenticatedRequest, res: Response) => {
    // Fetch buddies
    const { data: buddies, error: buddiesError } = await supabaseClient
        .from('buddies')
        .select('auth_user_id, buddy_auth_user_id')
        .or(`auth_user_id.eq.${req.authUserId},buddy_auth_user_id.eq.${req.authUserId}`);

    if (buddiesError) {
        console.error('Error fetching buddies:', buddiesError);
        return res.status(500).json({ error: 'Failed to fetch buddies' });
    }
    const buddyIds = buddies.map(buddy =>
        buddy.buddy_auth_user_id === req.authUserId ? buddy.auth_user_id : buddy.buddy_auth_user_id
    ).filter(id => id !== req.authUserId);

    // Fetch buddies' wishlists
    const { data: buddiesWishlists, error: buddiesWishlistsError } = await supabaseClient
        .from('event_wishlist')
        .select('event_id, user:users(user_id, name, avatar_url)')
        .in('user_id', buddyIds)
        .returns<BuddyWishlistRaw[]>();

    if (buddiesWishlistsError) {
        console.error('Error fetching buddies wishlists:', buddiesWishlistsError);
        return res.status(500).json({ error: 'Failed to fetch buddies wishlists' });
    }

    // Process and format the data
    interface BuddyWishlistRaw {
        user: {
            user_id: string;
            name: string;
            avatar_url: string | null;
        };
        event_id: string
    }

    interface BuddyWishlist {
        user_id: string;
        name: string;
        avatar_url: string | null;
        events: string[];
    }

    const out = buddiesWishlists.reduce((acc, curr) => {
        const existingUser = acc.find(user => user.user_id === curr.user.user_id);
        if (existingUser) {
            existingUser.events.push(curr.event_id);
        } else {
            acc.push({
                user_id: curr.user.user_id,
                name: curr.user.name,
                avatar_url: curr.user.avatar_url,
                events: [curr.event_id]
            });
        }
        return acc;
    }, [] as BuddyWishlist[]);

    res.status(200).json(out);
});

// GET /wishlist - Get user's wishlist
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

// POST /wishlist/:eventId - Add an event to the wishlist
router.post('/:eventId', authenticateRequest, async (req: AuthenticatedRequest, res: Response) => {
    const { eventId } = req.params;
    if (!req.authUserId) throw new Error('Unauthorized')

    if (!eventId) {
        return res.status(400).json({ error: 'Event ID is required' });
    }

    const { error } = await supabaseClient
        .from('event_wishlist')
        .insert([{ user_id: req.authUserId, event_id: eventId }]);

    if (error) {
        throw new Error(`Error saving event to wishlist: ${error.message}`);
    }

    return res.status(201).json({ message: 'Event added to wishlist' });
});

// DELETE /wishlist/:eventId - Remove an event from the wishlist
router.delete('/:eventId', authenticateRequest, async (req: AuthenticatedRequest, res: Response) => {
    const { eventId } = req.params;
    if (!req.authUserId) throw new Error('Unauthorized')

    if (!eventId) {
        return res.status(400).json({ error: 'Event ID is required' });
    }

    const { error } = await supabaseClient
        .from('event_wishlist')
        .delete()
        .eq('user_id', req.authUserId)
        .eq('event_id', eventId);

    if (error) {
        throw new Error(`Error deleting event from wishlist: ${error.message}`);
    }


    return res.status(200).json({ message: 'Event removed from wishlist' });
});

// GET /wishlist/sharedEvents - Get shared events between user and buddies
router.get('/sharedEvents', authenticateRequest, async (req: AuthenticatedRequest, res: Response) => {
    try {
        // 1. List all buddies of this user
        const { data: buddies, error: buddiesError } = await supabaseClient
            .from('buddies')
            .select('auth_user_id, buddy_auth_user_id')
            .or(`auth_user_id.eq.${req.authUserId},buddy_auth_user_id.eq.${req.authUserId}`);

        if (buddiesError) {
            console.error('Error fetching buddies:', buddiesError);
            return res.status(500).json({ error: 'Failed to fetch buddies' });
        }
        const buddyIds = buddies.map(buddy =>
            buddy.buddy_auth_user_id === req.authUserId ? buddy.auth_user_id : buddy.buddy_auth_user_id
        ).filter(id => id !== req.authUserId);

        // 2. Look up this user's wishlist
        const { data: userWishlist, error: userWishlistError } = await supabaseClient
            .from('event_wishlist')
            .select('event_id')
            .eq('user_id', req.authUserId);

        if (userWishlistError) {
            console.error('Error fetching user wishlist:', userWishlistError);
            return res.status(500).json({ error: 'Failed to fetch user wishlist' });
        }

        // 3. Look up all the other users' wishlists
        const { data: buddiesWishlists, error: buddiesWishlistsError } = await supabaseClient
            .from('event_wishlist')
            .select(`
                event_id, 
                user:user_id (
                    user_id,
                    name,
                    avatar_url
                )
            `)
            .in('user_id', buddyIds);

        if (buddiesWishlistsError) {
            console.error('Error fetching buddies wishlists:', buddiesWishlistsError);
            return res.status(500).json({ error: 'Failed to fetch buddies wishlists' });
        }

        // 4. Create a record of shared events with their corresponding buddies
        type SharedEventRaw = {
            event_id: string;
            user: {
                user_id: string;
                name: string;
                avatar_url: string | null;
            };
        };

        type SharedEvent = {
            eventId: string;
            sharedBuddies: {
                user_id: string;
                name: string;
                avatar_url: string | null;
            }[];
        };

        const userWishlistSet = new Set(userWishlist.map(item => item.event_id));
        const sharedEventsMap = new Map<string, SharedEvent>();

        buddiesWishlists.forEach((item: SharedEventRaw) => {
            if (userWishlistSet.has(item.event_id)) {
                if (!sharedEventsMap.has(item.event_id)) {
                    sharedEventsMap.set(item.event_id, { eventId: item.event_id, sharedBuddies: [] });
                }

                // Check if the buddy is already in the sharedBuddies array
                const buddyExists = sharedEventsMap.get(item.event_id)!.sharedBuddies.some(buddy => buddy.user_id === item.user.user_id);
                if (!buddyExists) {
                    sharedEventsMap.get(item.event_id)!.sharedBuddies.push({
                        user_id: item.user.user_id,
                        name: item.user.name,
                        avatar_url: item.user.avatar_url
                    });
                }
            }
        });

        const sharedEvents = Array.from(sharedEventsMap.values()) as SharedEvent[];

        res.json(sharedEvents);
    } catch (err) {
        console.error(err);
        res.status(500).send('Failed to fetch shared wishlist events');
    }
});

export default router;
