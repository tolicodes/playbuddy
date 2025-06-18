import React, { useState } from 'react';
import { useFetchOrganizers } from '../../common/db-axios/useOrganizers';
import { useFetchEvents } from '../../common/db-axios/useEvents';
import {
    useAddPromoCodeToEvent,
    useDeletePromoCodeFromEvent,
    useFetchPromoCodes,
} from '../../common/db-axios/usePromoCodes';

export function PromoCodeEventManager() {
    const [selectedOrganizerId, setSelectedOrganizerId] = useState('');
    const [search, setSearch] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedCodes, setSelectedCodes] = useState<{ [eventId: string]: string }>({});

    const { data: organizers = [], isLoading: loadingOrganizers } = useFetchOrganizers();
    const { data: events = [], isLoading: loadingEvents } = useFetchEvents();
    const { data: promoCodes = [], isLoading: loadingPromoCodes } = useFetchPromoCodes();

    const organizerPromoCodes = promoCodes.filter(pc => pc.organizer_id + '' === selectedOrganizerId);
    const filteredEvents = events.filter(e => e.organizer.id + '' === selectedOrganizerId);
    const filteredOrganizers = organizers.filter(org =>
        org.name.toLowerCase().includes(search.toLowerCase())
    );

    const addPromo = useAddPromoCodeToEvent();
    const deletePromo = useDeletePromoCodeFromEvent();

    const handleAttach = ({ eventId, promoCodeId }: { eventId: string, promoCodeId: string }) => {
        addPromo.mutate({ eventId, promoCodeId });
    };

    const handleDetach = ({ eventId, promoCodeId }: { eventId: string, promoCodeId: string }) => {
        deletePromo.mutate({ eventId, promoCodeId });
    };

    if (loadingOrganizers || loadingEvents || loadingPromoCodes) {
        return <p>Loading...</p>;
    }

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h2>Promo Code Manager</h2>

            <label>
                Search Organizer:{' '}
                <input
                    type="text"
                    value={search}
                    onChange={e => {
                        setSearch(e.target.value);
                        setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 150)} // allow click
                    style={{ width: '100%', padding: '8px', marginTop: '8px', marginBottom: '4px' }}
                />
            </label>

            {showDropdown && filteredOrganizers.length > 0 && (
                <ul style={{ border: '1px solid #ccc', borderRadius: 4, listStyle: 'none', padding: 0, maxHeight: 150, overflowY: 'auto' }}>
                    {filteredOrganizers.map(org => (
                        <li
                            key={org.id}
                            style={{ padding: '8px', cursor: 'pointer', backgroundColor: org.id + '' === selectedOrganizerId ? '#eee' : '#fff' }}
                            onClick={() => {
                                setSelectedOrganizerId(org.id + '');
                                setSearch(org.name);
                                setShowDropdown(false);
                            }}
                        >
                            {org.name}
                        </li>
                    ))}
                </ul>
            )}

            {selectedOrganizerId && (
                <div style={{ marginTop: '30px' }}>
                    <h3>Events</h3>
                    {filteredEvents.map(event => {
                        const attached = event.promo_codes?.[0];

                        return (
                            <div key={event.id} style={{ borderBottom: '1px solid #ccc', padding: '12px 0' }}>
                                <strong>{event.name}</strong>

                                {attached ? (
                                    <div style={{ marginTop: 8 }}>
                                        <span
                                            style={{
                                                display: 'inline-block',
                                                backgroundColor: '#f0f0f0',
                                                padding: '6px 12px',
                                                borderRadius: '20px',
                                                marginRight: '8px',
                                            }}
                                        >
                                            {attached.promo_code}
                                            <button
                                                style={{
                                                    marginLeft: 8,
                                                    color: 'red',
                                                    border: 'none',
                                                    background: 'none',
                                                    cursor: 'pointer',
                                                }}
                                                onClick={() =>
                                                    handleDetach({ eventId: event.id + '', promoCodeId: attached.id })
                                                }
                                            >
                                                ×
                                            </button>
                                        </span>
                                    </div>
                                ) : (
                                    <div style={{ marginTop: 8 }}>
                                        <select
                                            value={selectedCodes[event.id] || ''}
                                            onChange={(e) =>
                                                setSelectedCodes(prev => ({ ...prev, [event.id]: e.target.value }))
                                            }
                                        >
                                            <option value="">-- Select Promo Code --</option>
                                            {organizerPromoCodes.map(pc => (
                                                <option key={pc.id} value={pc.id}>
                                                    {pc.promo_code}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={() =>
                                                handleAttach({
                                                    eventId: event.id + '',
                                                    promoCodeId: selectedCodes[event.id] + '',
                                                })
                                            }
                                            style={{ marginLeft: '10px' }}
                                        >
                                            Attach
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
