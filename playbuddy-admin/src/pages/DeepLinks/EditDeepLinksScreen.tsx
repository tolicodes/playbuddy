import React, { useState, useMemo } from 'react';
import {
    Box, Button, MenuItem, Paper, TextField, Typography
} from '@mui/material';
import { useFetchEvents } from '../../common/db-axios/useEvents';
import { useFetchPromoCodes } from '../../common/db-axios/usePromoCodes';
import { useFetchFacilitators } from '../../common/db-axios/useFacilitators';
import { useFetchOrganizers } from '../../common/db-axios/useOrganizers';
import { useAddDeepLink } from '../../common/db-axios/useDeepLinks';
import { PromoCode } from '../../common/types/commonTypes';
import { createBranchCSV } from '../../lib/createBranchCSV';

export default function AddDeepLinkForm() {
    const { data: events = [] } = useFetchEvents();
    const { data: promoCodes = [] } = useFetchPromoCodes();
    const { data: facilitators = [] } = useFetchFacilitators();
    const { data: organizers = [] } = useFetchOrganizers();
    const addDeepLinkMutation = useAddDeepLink();

    const [campaign, setCampaign] = useState('');
    const [type, setType] = useState('');
    const [campaignStartDate, setCampaignStartDate] = useState('');
    const [campaignEndDate, setCampaignEndDate] = useState('');
    const [channel, setChannel] = useState('');

    const [featuredEventId, setFeaturedEventId] = useState('');
    const [facilitatorId, setFacilitatorId] = useState('');
    const [organizerId, setOrganizerId] = useState('');
    const [featuredPromoCodeId, setFeaturedPromoCodeId] = useState('');

    const [slugUrl, setSlugUrl] = useState('');

    const filteredEvents = useMemo(() => {
        return events.filter(e => e.organizer?.id === Number(organizerId));
    }, [events, organizerId]);

    const filteredPromoCodes: (PromoCode & { label?: string })[] = useMemo(() => {
        if (type === 'event_promo_code') {
            return promoCodes.filter(p => p.organizer_id === Number(organizerId));
        }
        if (type === 'organizer_promo_code') {
            return promoCodes.filter(p => p.organizer_id === Number(organizerId));
        }
        if (type === 'facilitator_profile') {
            return promoCodes.map(p => ({
                ...p,
                label: `${organizers.find(o => o.id === p.organizer_id)?.name || 'Unknown'} → ${p.promo_code}`
            })) as (PromoCode & { label?: string })[];
        }
        return [];
    }, [type, organizerId, promoCodes, organizers]);

    const handleSubmit = () => {
        const slug = slugUrl.trim().replace('https://l.playbuddy.me/', '');
        const deepLinkData = {
            campaign,
            slug,
            type,
            featured_event_id: featuredEventId,
            featured_promo_code_id: featuredPromoCodeId,
            facilitator_id: facilitatorId,
            organizer_id: organizerId,
            campaign_start_date: campaignStartDate,
            campaign_end_date: campaignEndDate,
            channel,
        };

        console.log('Submitting deep link:', deepLinkData);

        addDeepLinkMutation.mutate(deepLinkData);
    };

    const handleDownloadCsv = () => {
        const event = events.find(e => e.id === Number(featuredEventId))?.description;

        const ogDescription = event ? `Sign up for ${event} on Playbuddy` : `Connect with Playbuddy`;

        createBranchCSV([{
            campaignName: campaign,
            ogDescription
        }])
    };

    return (
        <Paper sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
            <Typography variant="h4" mb={2}>Add Deep Link</Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField label="Campaign Name" value={campaign} onChange={(e) => setCampaign(e.target.value)} />

                <TextField label="Branch Slug URL" value={slugUrl} onChange={(e) => setSlugUrl(e.target.value)} />

                <TextField label="Type" select value={type} onChange={(e) => setType(e.target.value)}>
                    <MenuItem value="facilitator_profile">Facilitator Profile</MenuItem>
                    <MenuItem value="event_promo_code">Event Promo Code</MenuItem>
                    <MenuItem value="weekly_picks">Weekly Picks</MenuItem>
                    <MenuItem value="organizer_promo_code">Organizer Promo Code</MenuItem>
                    <MenuItem value="generic">Generic</MenuItem>
                </TextField>

                {(type === 'event_promo_code') && (
                    <>
                        <TextField label="Organizer" select value={organizerId} onChange={(e) => setOrganizerId(e.target.value)}>
                            {organizers.map(o => (
                                <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>
                            ))}
                        </TextField>

                        <TextField label="Featured Event" select value={featuredEventId} onChange={(e) => setFeaturedEventId(e.target.value)}>
                            {filteredEvents.map(e => (
                                <MenuItem key={e.id} value={e.id}>{e.name}</MenuItem>
                            ))}
                        </TextField>

                        <TextField label="Featured Promo Code" select value={featuredPromoCodeId} onChange={(e) => setFeaturedPromoCodeId(e.target.value)}>
                            {filteredPromoCodes.map(p => (
                                <MenuItem key={p.id} value={p.id}>{p.promo_code}</MenuItem>
                            ))}
                        </TextField>
                    </>
                )}

                {(type === 'facilitator_profile') && (
                    <>
                        <TextField label="Facilitator" select value={facilitatorId} onChange={(e) => setFacilitatorId(e.target.value)}>
                            {facilitators.map(f => (
                                <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
                            ))}
                        </TextField>

                        <TextField label="Featured Promo Code" select value={featuredPromoCodeId} onChange={(e) => setFeaturedPromoCodeId(e.target.value)}>
                            {filteredPromoCodes.map(p => (
                                <MenuItem key={p.id} value={p.id}>{p.label}</MenuItem>
                            ))}
                        </TextField>
                    </>
                )}

                {(type === 'organizer_promo_code') && (
                    <>
                        <TextField label="Organizer" select value={organizerId} onChange={(e) => setOrganizerId(e.target.value)}>
                            {organizers.map(o => (
                                <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>
                            ))}
                        </TextField>

                        <TextField label="Featured Promo Code" select value={featuredPromoCodeId} onChange={(e) => setFeaturedPromoCodeId(e.target.value)}>
                            {filteredPromoCodes.map(p => (
                                <MenuItem key={p.id} value={p.id}>{p.promo_code}</MenuItem>
                            ))}
                        </TextField>
                    </>
                )}

                <TextField
                    label="Campaign Start Date"
                    type="date"
                    value={campaignStartDate}
                    onChange={(e) => setCampaignStartDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                />

                <TextField
                    label="Campaign End Date"
                    type="date"
                    value={campaignEndDate}
                    onChange={(e) => setCampaignEndDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                />

                <TextField label="Channel" value={channel} onChange={(e) => setChannel(e.target.value)} />

                <Box>
                    <Typography variant="h6" mt={4}>Export Branch CSV</Typography>
                    <Button variant="outlined" onClick={handleDownloadCsv} sx={{ mt: 2 }}>Download CSV</Button>
                </Box>

                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    sx={{ mt: 4 }}
                    disabled={addDeepLinkMutation.isPending}
                >
                    {addDeepLinkMutation.isPending ? 'Submitting...' : 'Submit'}
                </Button>
                {addDeepLinkMutation.isSuccess && (
                    <Typography color="success.main" fontSize="0.875rem" sx={{ mt: 1 }}>
                        Deep link created successfully.
                    </Typography>
                )}
                {addDeepLinkMutation.isError && (
                    <Typography color="error.main" fontSize="0.875rem" sx={{ mt: 1 }}>
                        Failed to create deep link: {(addDeepLinkMutation.error as Error)?.message ?? 'Unknown error'}
                    </Typography>
                )}
            </Box>
        </Paper>
    );
}
