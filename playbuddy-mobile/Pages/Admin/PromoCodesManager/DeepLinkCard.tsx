import React from 'react';
import { Card, Button } from 'react-native-paper';
import { Organizer, Event, PromoCode, DeepLink } from '../../../commonTypes';
import OrganizerDropdown from '../Dropdowns/OrganizerDropdown';
import EventDropdown from '../Dropdowns/EventDropdown';
import PromoCodeDropdown from '../Dropdowns/PromoCodeDropdown';

export default function DeepLinkCard({
    deepLink,
    organizers,
    events,
    promoCodes,
    onChange,
    onDelete,
    onCreatePromoCode,
}: {
    deepLink: DeepLink;
    organizers: Organizer[];
    events: Event[];
    promoCodes: PromoCode[];
    onChange: (updated: DeepLink) => void;
    onDelete: () => void;
    onCreatePromoCode: (organizerId: number) => void;
}) {
    const filteredEvents = events.filter(
        (e) => e.organizer.id === deepLink.organizer.id
    );
    const organizerChanged = (id: number) => {
        onChange({
            ...deepLink,
            organizer: id,
            event_id: 0,
            promo_code_id: 0,
        });
    };

    console.log('organizers', organizers);

    return (
        <Card style={{ margin: 8 }}>
            <Card.Content>
                <OrganizerDropdown
                    value={deepLink.organizer.id}
                    options={organizers}
                    onChange={organizerChanged}
                />
                <EventDropdown
                    value={deepLink?.featured_event?.id || 0}
                    options={filteredEvents}
                    onChange={(id: number) => onChange({ ...deepLink, featured_event: id })}
                />
                <PromoCodeDropdown
                    value={deepLink?.featured_promo_code?.id || 0}
                    options={promoCodes.filter(
                        (p) => p.organizer_id === deepLink.organizer.id
                    )}
                    onChange={(id: number | 'new') => {
                        if (id === 'new') {
                            onCreatePromoCode(deepLink.organizer.id);
                        } else {
                            onChange({ ...deepLink, featured_promo_code: id });
                        }
                    }}
                />
            </Card.Content>
            <Card.Actions>
                <Button onPress={onDelete} textColor="red">
                    Delete
                </Button>
            </Card.Actions>
        </Card>
    );
}
