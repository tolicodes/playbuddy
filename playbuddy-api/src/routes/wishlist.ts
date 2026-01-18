import { Request, Response, Router } from 'express';
import { supabaseClient } from '../connections/supabaseClient.js'; // Adjust the import path to match your project
import { AuthenticatedRequest, authenticateRequest } from '../middleware/authenticateRequest.js'; // Adjust the import path to match your project
import { fetchPaginatedSwipeModeChoicesRecords } from '../helpers/fetchPaginatedSwipeModeChoicesRecords.js';
import { fetchAllRows } from '../helpers/fetchAllRows.js';

const router = Router();

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
        .select('event_id, user:users(user_id, name, avatar_url, share_calendar)')
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
            share_calendar?: boolean | null;
        };
        event_id: string
    }

    interface BuddyWishlist {
        user_id: string;
        name: string;
        avatar_url: string | null;
        events: string[];
    }

    const shareableWishlists = buddiesWishlists.filter((entry) => entry.user?.share_calendar);

    const out = shareableWishlists.reduce((acc, curr) => {
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

    return res.status(200).json(out);
});

// GET /wishlist - Get user's wishlist
router.get('/', authenticateRequest, async (req: AuthenticatedRequest, res: Response) => {
    const includeMeta =
        req.query.includeMeta === 'true' ||
        req.query.include_meta === 'true';
    if (includeMeta) {
        const { data, error } = await supabaseClient
            .from('event_wishlist')
            .select('event_id, created_at')
            .eq('user_id', req.authUserId);

        if (error) {
            throw new Error(`Error fetching wishlist: ${error.message}`);
        }

        const entries = data
            .map((wishlist_event: { event_id: string; created_at?: string | null }) => ({
                event_id: Number(wishlist_event.event_id),
                created_at: wishlist_event.created_at ?? null,
            }))
            .filter((entry) => Number.isFinite(entry.event_id));
        return res.status(200).json(entries);
    }

    const { data, error } = await supabaseClient
        .from('event_wishlist')
        .select('event_id')
        .eq('user_id', req.authUserId);

    if (error) {
        throw new Error(`Error fetching wishlist: ${error.message}`);
    }

    const eventIds = data.map((wishlist_event: { event_id: string }) => wishlist_event.event_id);

    return res.status(200).json(eventIds);
});

router.get('/swipe_mode_choices', authenticateRequest, async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.authUserId) throw new Error('Unauthorized')
        const data = await fetchPaginatedSwipeModeChoicesRecords(req.authUserId);

        const swipeModeChosenWishlist = data
            .filter((choice) => choice.choice === 'wishlist')
            .map((choice) => choice.event_id);

        const swipeModeChosenSkip = data
            .filter((choice) => choice.choice === 'skip')
            .map((choice) => choice.event_id);

        return res.status(200).json({
            swipeModeChosenWishlist,
            swipeModeChosenSkip,
        });
    } catch (error: any) {
        console.error(`Error fetching swipe mode choices: ${error?.message}`);
        return res.status(500).json({ error: 'Failed to fetch swipe mode choices' });
    }
});

router.post('/swipe_mode_choices', authenticateRequest, async (req: AuthenticatedRequest, res: Response) => {
    const { event_id, choice, list } = req.body;

    const { data, error } = await supabaseClient
        .from('swipe_mode_choices')
        .insert([{ event_id, user_id: req.authUserId, choice, list }]);

    console.log('recording swipe choice', { event_id, choice, list })

    if (error) {
        console.error(`Error recording swipe choice: ${error.message}`);
        return res.status(500).json({ error: 'Failed to record swipe choice' });
    }

    return res.status(200).json(data);
});

const addEventToWishlist = async (req: AuthenticatedRequest, res: Response) => {
    const { eventId } = req.params;
    if (!req.authUserId) throw new Error('Unauthorized')

    if (!eventId) {
        return res.status(400).json({ error: 'Event ID is required' });
    }

    const { error, data } = await supabaseClient
        .from('event_wishlist')
        .insert([{ user_id: req.authUserId, event_id: eventId }])
        .select()
        .single()
        ;

    console.log('added', { eventId, userId: req.authUserId });

    if (error) {
        throw new Error(`Error saving event to wishlist: ${error.message}`);
    }

    return res.status(201).json(data);
}

// Phase this out
router.post('/:eventId', authenticateRequest, addEventToWishlist);

router.post('/add/:eventId', authenticateRequest, addEventToWishlist);

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
                    avatar_url,
                    share_calendar
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
                share_calendar?: boolean | null;
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

        // @ts-ignore
        buddiesWishlists.forEach((item: SharedEventRaw) => {
            if (!item.user?.share_calendar) return;
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

        return res.json(sharedEvents);
    } catch (err) {
        console.error(err);
        return res.status(500).send('Failed to fetch shared wishlist events');
    }
});

// GET /wishlist/code/:share_code - Get user's wishlist by promo code
router.get('/code/:share_code', async (req: Request, res: Response) => {
    const { share_code } = req.params;

    const { data: user, error: userError } = await supabaseClient
        .from('users')
        .select('user_id')
        .eq('share_code', share_code)
        .single();

    if (userError || !user) {
        throw new Error(`Error fetching user: ${userError.message}`);
    }

    try {
        const data = await fetchAllRows({
            from: 'event_wishlist',
            select: 'event_id',
            where: `user_id.eq.${user.user_id}`
        });

        // console.log('wish', data)

        const eventIds = data.map((wishlist_event: { event_id: string }) => wishlist_event.event_id);

        return res.status(200).json(eventIds);
    } catch (error) {
        if (error instanceof Error) {
            console.error(`Error fetching calendar: ${error.message}`);
        }
        return res.status(500).json({ error: 'Failed to fetch calendar' });
    }
});

export default router;
