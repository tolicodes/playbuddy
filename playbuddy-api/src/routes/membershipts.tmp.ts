// import { Request, Response } from 'express';
// import { supabaseClient } from '../connections/supabaseClient.js';
// import { AuthenticatedRequest } from '../middleware/authenticateRequest.js';

// // Manage pending membership requests
// export const managePendingMemberships = async (req: AuthenticatedRequest, res: Response) => {
//     const { auth_user_id } = req.query;

//     try {
//         const { data: communities } = await supabaseClient
//             .from('communities')
//             .select('id')
//             .in('id', supabaseClient
//                 .from('community_memberships')
//                 .select('community_id')
//                 .eq('auth_user_id', auth_user_id)
//                 .eq('membership_type', 'admin'));

//         const { data: pendingRequests } = await supabaseClient
//             .from('community_memberships')
//             .select('id, auth_user_id, community_id, status')
//             .eq('status', 'pending')
//             .in('community_id', communities.map(c => c.id));

//         res.json(pendingRequests);
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Failed to fetch pending requests');
//     }
// };

// // Approve membership
// export const approveMembership = async (req: Request, res: Response) => {
//     const { membership_id } = req.body;

//     try {
//         const { error } = await supabaseClient
//             .from('community_memberships')
//             .update({ status: 'approved' })
//             .eq('id', membership_id);

//         if (error) throw error;
//         res.status(200).send('Membership approved');
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Failed to approve membership');
//     }
// };

// // Deny membership
// export const denyMembership = async (req: Request, res: Response) => {
//     const { membership_id } = req.body;

//     try {
//         const { error } = await supabaseClient
//             .from('community_memberships')
//             .update({ status: 'denied' })
//             .eq('id', membership_id);

//         if (error) throw error;
//         res.status(200).send('Membership denied');
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Failed to deny membership');
//     }
// };
