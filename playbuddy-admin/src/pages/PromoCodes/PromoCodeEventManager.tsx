import React, { useState } from 'react';
import { useFetchOrganizers } from '../../common/db-axios/useOrganizers';
import { useFetchEvents } from '../../common/db-axios/useEvents';
import {
    useAddPromoCodeToEvent,
    useDeletePromoCode,
    useDeletePromoCodeFromEvent,
    useFetchPromoCodes,
} from '../../common/db-axios/usePromoCodes';
import { CreatePromoCode } from './CreatePromoCode';

export function PromoCodeEventManager() {
    const [selectedOrganizerId, setSelectedOrganizerId] = useState('');
    const [search, setSearch] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedCodes, setSelectedCodes] = useState<{ [eventId: string]: string }>({});
    const [deletingPromoCodeId, setDeletingPromoCodeId] = useState<string | null>(null);

    const { data: organizers = [], isLoading: loadingOrganizers } = useFetchOrganizers();
    const { data: events = [], isLoading: loadingEvents } = useFetchEvents({
        includeHidden: true,
        includeHiddenOrganizers: true,
    });
    const { data: promoCodes = [], isLoading: loadingPromoCodes } = useFetchPromoCodes();

    const organizerPromoCodes = promoCodes.filter(pc => pc.organizer_id + '' === selectedOrganizerId);
    const filteredEvents = events.filter(e => e.organizer.id + '' === selectedOrganizerId);
    const filteredOrganizers = organizers.filter(org =>
        org.name.toLowerCase().includes(search.toLowerCase())
    );

    const addPromo = useAddPromoCodeToEvent();
    const deletePromoFromEvent = useDeletePromoCodeFromEvent();
    const deletePromoCode = useDeletePromoCode();

    const handleAttach = ({ eventId, promoCodeId }: { eventId: string, promoCodeId: string }) => {
        addPromo.mutate({ eventId, promoCodeId });
    };

    const handleDetach = ({ eventId, promoCodeId }: { eventId: string, promoCodeId: string }) => {
        deletePromoFromEvent.mutate({ eventId, promoCodeId });
    };

    const handleDeletePromoCode = async (promoCodeId: string) => {
        const promo = promoCodes.find((code) => code.id === promoCodeId);
        const label = promo?.promo_code ? ` "${promo.promo_code}"` : '';
        if (!window.confirm(`Delete promo code${label}? This will remove it from any events.`)) {
            return;
        }
        setDeletingPromoCodeId(promoCodeId);
        try {
            const attachedEvents = filteredEvents.filter((event) =>
                event.promo_codes?.some((code) => code.id === promoCodeId)
            );
            for (const event of attachedEvents) {
                await deletePromoFromEvent.mutateAsync({
                    eventId: event.id + '',
                    promoCodeId,
                });
            }
            await deletePromoCode.mutateAsync(promoCodeId);
            setSelectedCodes((prev) => {
                const next = { ...prev };
                Object.keys(next).forEach((eventId) => {
                    if (next[eventId] === promoCodeId) {
                        delete next[eventId];
                    }
                });
                return next;
            });
        } catch (error) {
            console.error('Failed to delete promo code', error);
            alert('Unable to delete promo code. Remove it from events or deep links and try again.');
        } finally {
            setDeletingPromoCodeId(null);
        }
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
                    <CreatePromoCode organizerId={selectedOrganizerId} />

                    {organizerPromoCodes.length > 0 && (
                        <div style={{ marginTop: 16 }}>
                            <h3>Organizer Promo Codes</h3>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                {organizerPromoCodes.map((pc) => (
                                    <li key={pc.id} style={{ padding: '6px 0', borderBottom: '1px solid #eee' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                                            <div>
                                                <strong>{pc.promo_code}</strong>{' '}
                                                <span style={{ color: '#555' }}>
                                                    {pc.discount_type === 'percent'
                                                        ? `${pc.discount}%`
                                                        : pc.discount_type === 'amount'
                                                            ? `$${pc.discount}`
                                                            : pc.discount_type}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleDeletePromoCode(pc.id)}
                                                disabled={deletingPromoCodeId === pc.id}
                                                style={{
                                                    color: '#b00020',
                                                    border: '1px solid #f2c4c4',
                                                    background: deletingPromoCodeId === pc.id ? '#fbe9e9' : 'transparent',
                                                    padding: '4px 10px',
                                                    borderRadius: 12,
                                                    cursor: deletingPromoCodeId === pc.id ? 'not-allowed' : 'pointer',
                                                }}
                                            >
                                                {deletingPromoCodeId === pc.id ? 'Deleting...' : 'Delete'}
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

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
