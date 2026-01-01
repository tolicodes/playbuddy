import styles from './EventDetails.module.css';
import { useParams } from "react-router-dom";
import { Helmet } from 'react-helmet';
import { useState } from "react";
import { useFetchEvents } from "../../../../common/src/db-axios/useEvents";
import { getBestPromoCode } from "../../../../playbuddy-mobile/utils/getBestPromoCode";
import ReactMarkdown from "react-markdown";
import { formatDate } from '../../../../playbuddy-mobile/utils/formatDate';
import WebEntryModal from '../WebEntryModal/WebEntryModal';
import { CalendarIcon, MapPinIcon, TagIcon } from "./util/Icons";
import { getTagChipTone, getTagChips } from "./util/tagUtils";
import type { EventWithMetadata } from "./util/types";

export const EventDetails = () => {
    const { eventId } = useParams();
    const { data: events } = useFetchEvents({
        includeFacilitatorOnly: true
    });

    const [showModal, setShowModal] = useState(true);

    const event = (events as EventWithMetadata[] | undefined)?.find(
        (event) => event.id === parseInt(eventId!),
    );
    if (!event) return null;

    const promoCode = getBestPromoCode(event);
    const imageUrl = event.image_url;
    const formattedDate = formatDate(event, true, true);
    const isFetlife = event.ticket_url?.includes('fetlife');
    const availableSoon = !event.ticket_url?.includes('https');
    const ticketUrl = (() => {
        if (!event.ticket_url) return '';
        if (!promoCode) return event.ticket_url;
        try {
            const url = new URL(event.ticket_url);
            url.searchParams.set('discount', promoCode.promo_code);
            return url.toString();
        } catch {
            const separator = event.ticket_url.includes('?') ? '&' : '?';
            return `${event.ticket_url}${separator}discount=${promoCode.promo_code}`;
        }
    })();
    const locationLabel = event.location || [event.city, event.region].filter(Boolean).join(', ');
    const tagChips = getTagChips(event);
    const organizerColor = event.organizerColor || '#fff';

    return (
        <>
            <Helmet>
                <title>{event.name} – PlayBuddy</title>
                <meta property="og:title" content={event.name} />
                <meta property="og:description" content={event.description} />
                <meta property="og:image" content={event.image_url} />
                <meta property="og:url" content={`https://playbuddy.me/events/${event.id}`} />
                <meta property="og:type" content="article" />
            </Helmet>
            {showModal && <WebEntryModal onClose={() => setShowModal(false)} />}
            <div className={styles.eventDetail}>
                <div className={styles.eventDetailInner}>
                    <div className={styles.hero}>
                        <div className={styles.heroMedia}>
                            {event.video_url ? (
                                <iframe
                                    className={styles.heroVideo}
                                    src={event.video_url}
                                    title="event video"
                                    allow="fullscreen"
                                />
                            ) : imageUrl ? (
                                <img src={imageUrl} alt={event.name} className={styles.heroImage} />
                            ) : (
                                <div className={styles.heroPlaceholder}>PlayBuddy Event</div>
                            )}
                        </div>
                        <div className={styles.heroGradient} />
                        {promoCode && (
                            <div className={styles.heroPromoBadge}>
                                {promoCode.discount_type === 'percent'
                                    ? `${promoCode.discount}% off`
                                    : `$${promoCode.discount} off`}
                            </div>
                        )}
                        <div className={styles.heroFooter}>
                            <h1 className={styles.heroTitle}>{event.name}</h1>
                            <div className={styles.heroOrganizer}>
                                <span
                                    className={styles.organizerDot}
                                    style={{ backgroundColor: organizerColor }}
                                />
                                <span className={styles.heroOrganizerText}>
                                    {event.organizer?.name || 'Organizer'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.headerSheet}>
                        <div className={styles.metaList}>
                            <div className={styles.metaLine}>
                                <CalendarIcon className={styles.metaIcon} />
                                <span className={styles.metaText}>{formattedDate}</span>
                            </div>
                            {locationLabel ? (
                                <div className={styles.metaLine}>
                                    <MapPinIcon className={styles.metaIcon} />
                                    <span className={styles.metaText}>{locationLabel}</span>
                                </div>
                            ) : null}
                            {event.price ? (
                                <div className={styles.metaLine}>
                                    <TagIcon className={styles.metaIcon} />
                                    <span className={styles.metaText}>{event.price}</span>
                                </div>
                            ) : null}
                        </div>

                        {tagChips.length > 0 && (
                            <div className={styles.tagRow}>
                                {tagChips.map((tag) => {
                                    const colors = getTagChipTone(tag);
                                    return (
                                        <span
                                            key={`${event.id}-${tag.label}`}
                                            className={styles.tagChip}
                                            style={{
                                                backgroundColor: colors.background,
                                                borderColor: colors.border,
                                                color: colors.text,
                                            }}
                                        >
                                            {tag.label}
                                        </span>
                                    );
                                })}
                            </div>
                        )}

                        <div className={styles.actionRow}>
                            <button
                                className={styles.ticketButton}
                                disabled={availableSoon}
                                onClick={() => window.open(ticketUrl, '_blank')}
                            >
                                Get Tickets
                            </button>
                        </div>

                        {promoCode && (
                            <div className={styles.promoBox}>
                                Use promo code <strong>{promoCode.promo_code}</strong> for{" "}
                                {promoCode.discount}
                                {promoCode.discount_type === "percent" ? "%" : "$"} off
                            </div>
                        )}
                    </div>

                    <div className={styles.eventDescription}>
                        {event.vetted && (
                            <div className={`${styles.eventCallout} ${styles.vetted}`}>
                                <strong>Vetted Event:</strong> You must apply to attend.{" "}
                                {event.vetting_url && (
                                    <a href={event.vetting_url} target="_blank" rel="noreferrer">
                                        Apply here
                                    </a>
                                )}
                            </div>
                        )}

                        {event.munch_id && (
                            <div className={`${styles.eventCallout} ${styles.munch}`}>
                                <strong>Munch:</strong> Casual social event. Learn more on the{" "}
                                <a href="#">Munch Page</a>.
                            </div>
                        )}

                        {isFetlife && (
                            <div className={`${styles.eventCallout} ${styles.fetlife}`}>
                                Imported from FetLife with organizer's permission. Requires a FetLife
                                account.
                                <br />
                                <a href={ticketUrl} target="_blank" rel="noreferrer">
                                    Open in FetLife
                                </a>
                            </div>
                        )}

                        <div className={styles.sectionCard}>
                            <div className={styles.sectionTitle}>About</div>
                            <div className={styles.eventMarkdown}>
                                <ReactMarkdown>{event.description}</ReactMarkdown>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
