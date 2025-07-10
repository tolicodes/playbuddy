import styles from './EventDetails.module.css';
import { useParams } from "react-router-dom";
import { Helmet } from 'react-helmet';
import { useState } from "react";
import { useFetchEvents } from "../../../../common/src/db-axios/useEvents";
import type { Event } from "../../../../common/src/types/commonTypes";
import { getBestPromoCode } from "../../../../playbuddy-mobile/utils/getBestPromoCode";
import ReactMarkdown from "react-markdown";
import { formatDate } from '../../../../playbuddy-mobile/utils/formatDate';
import WebEntryModal from '../WebEntryModal/WebEntryModal';

export const EventDetails = () => {
    const { eventId } = useParams();
    const { data: events } = useFetchEvents({
        includeFacilitatorOnly: true
    });

    const [showModal, setShowModal] = useState(true);

    const event = events?.find((event: Event) => event.id === parseInt(eventId!));
    if (!event) return null;

    const promoCode = getBestPromoCode(event);
    const imageUrl = event.image_url;
    const formattedDate = formatDate(event);
    const isFetlife = event.ticket_url?.includes('fetlife');
    const availableSoon = !event.ticket_url?.includes('https');

    if (showModal) {
        return <WebEntryModal onClose={() => setShowModal(false)} />
    }

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
            Hi
            <div className={styles.eventDetail}>
                {event.video_url ? (
                    <iframe
                        className={styles.eventVideo}
                        src={event.video_url}
                        title="event video"
                        allow="fullscreen"
                    />
                ) : imageUrl ? (
                    <img src={imageUrl} alt="event" className={styles.eventHeaderImage} />
                ) : null}

                <div className={styles.eventHeaderCard}>
                    <h1 className={styles.eventTitle}>{event.name}</h1>
                    <div className={styles.eventOrganizer}>Organized by {event.organizer?.name}</div>
                    <div className={styles.eventDate}>{formattedDate}</div>

                    <button
                        className={styles.ticketButton}
                        disabled={availableSoon}
                        onClick={() => window.open(event.ticket_url, '_blank')}
                    >
                        🎟️ Get Tickets 🎟️
                    </button>

                    {promoCode && (
                        <div className={styles.promoBox}>
                            Use promo code <strong>{promoCode.promo_code}</strong> for {promoCode.discount}{promoCode.discount_type === 'percent' ? '%' : '$'} off
                        </div>
                    )}
                </div>

                <div className={styles.eventDescription}>
                    {event.vetted && (
                        <div className={`${styles.eventCallout} ${styles.vetted}`}>
                            <strong>Vetted Event:</strong> You must apply to attend. {event.vetting_url && <a href={event.vetting_url} target="_blank">Apply here</a>}
                        </div>
                    )}

                    {event.munch_id && (
                        <div className={`${styles.eventCallout} ${styles.munch}`}>
                            <strong>Munch:</strong> Casual social event. Learn more on the <a href="#">Munch Page</a>.
                        </div>
                    )}

                    {isFetlife && (
                        <div className={`${styles.eventCallout} ${styles.fetlife}`}>
                            🔗 Imported from FetLife with organizer's permission. Requires a FetLife account.
                            <br />
                            <a href={event.ticket_url} target="_blank">Open in FetLife</a>
                        </div>
                    )}

                    <div className={styles.eventMarkdown}>
                        <ReactMarkdown>{event.description}</ReactMarkdown>
                    </div>
                </div>
            </div>
        </>
    );
};