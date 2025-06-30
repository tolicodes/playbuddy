import { Media } from "../../commonTypes.js";

type MediaRelation = {
    media: Media;
    sort_order: number;
}

export const transformMedia = (mediaRelations: MediaRelation[]) => {
    return mediaRelations?.map((mr: MediaRelation) => {
        return {
            ...mr.media,
            sort_order: mr.sort_order,
        }
    })
}