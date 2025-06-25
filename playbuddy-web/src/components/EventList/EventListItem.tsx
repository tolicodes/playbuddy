import React from "react";
import styles from './EventListItem.module.css'
import { getBestPromoCode } from "@mobile/utils/getBestPromoCode";
import type { Event } from "@common/types/commonTypes";
import { formatDate } from "@mobile/utils/formatDate";

export const EventListItem = ({ item, onPress }: { item: Event, onPress: (event: Event) => void }) => {
    const promoCode = getBestPromoCode(item)?.[0];
    const imageUrl = item.image_url;
    const formattedDate = formatDate(item);

    return (
        <div className={styles.eventCard} onClick={() => onPress(item)}>
            <div className={styles.eventTopSection}>
                <div className={styles.eventImage}>
                    {imageUrl ? (
                        <img src={imageUrl} alt="event" />
                    ) : (
                        <span className={styles.placeholderIcon}>📅</span>
                    )}
                </div>
                <div className={styles.eventDetails}>
                    <div className={styles.organizerRow}>
                        <div className={styles.organizerInfo}>
                            <div
                                className={styles.organizerDot}
                                style={{ backgroundColor: item.organizerColor || '#ccc' }}
                            />
                            <span className={styles.organizerName}>{item.organizer?.name}</span>
                        </div>
                        <div className={styles.rightInfo}>
                            {promoCode && (
                                <div className={styles.discountBadge}>
                                    {promoCode.discount}{promoCode.discount_type === 'percent' ? '%' : '$'} off
                                </div>
                            )}
                        </div>
                    </div>
                    <div className={styles.eventTitle}>{item.name}</div>
                    <div className={styles.eventTime}>{formattedDate}</div>
                </div>
            </div>
        </div>
    );
};