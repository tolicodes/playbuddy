import { Organizer } from "../../../common/types/commonTypes.js";
export declare function upsertOrganizer(organizer: Omit<Organizer, 'id'>): Promise<{
    organizerId?: string;
    communityId?: string;
}>;
export declare const upsertCommunityFromOrganizer: ({ organizerId, organizerName }: {
    organizerId: string;
    organizerName: string;
}) => Promise<any>;
//# sourceMappingURL=upsertOrganizer.d.ts.map