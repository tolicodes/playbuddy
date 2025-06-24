export const EVENT_FIELDS = [
    'original_id',
    'type',
    'recurring',
    'name',
    'start_date',
    'end_date',
    'ticket_url',
    'event_url',
    'image_url',
    'location',
    'price',
    'description',
    'tags',
    'short_description',
    'non_ny',
    'timestamp_scraped',
    'source_origination_group_id',
    'source_origination_group_name',
    'source_origination_platform',
    'source_ticketing_platform',
    'dataset',
    'visibility',
    'play_party',
    'vetted',
    'vetting_url',
    'video_url',
    'city',
    'region',
    'country',
    'lat',
    'lon',
    'weekly_pick',
    'custom_description',
    'facilitator_only',
    'munch_id'
] as const;

// we supply
// id: existingEventId || undefined,
// organizer_id: organizerId,
// imageUrl
//timestamp_scraped
// visibility
// location_area_id