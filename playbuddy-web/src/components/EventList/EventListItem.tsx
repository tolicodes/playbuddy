import styles from "./EventListItem.module.css";
import type { KeyboardEvent } from "react";
import { getBestPromoCode } from "../../../../playbuddy-mobile/utils/getBestPromoCode";
import { formatDate } from "../../../../playbuddy-mobile/utils/formatDate";
import type { EventWithMetadata } from "./util/types";
import {
    EVENT_RAIL_COLORS,
    getEventTypeKey,
    getTagChipTone,
    getTagChips,
} from "./util/tagUtils";
import { CalendarIcon, MapPinIcon, TagIcon } from "./util/Icons";

export const EventListItem = ({
    item,
    onPress,
}: {
    item: EventWithMetadata;
    onPress: (event: EventWithMetadata) => void;
}) => {
    const promoCode = getBestPromoCode(item);
    const imageUrl = item.image_url;
    const formattedDate = formatDate(item);
    const locationLabel = item.neighborhood || item.location || item.city || item.region || "";
    const tagChips = getTagChips(item);
    const eventTypeKey = getEventTypeKey(item);
    const eventRailColor = EVENT_RAIL_COLORS[eventTypeKey] || EVENT_RAIL_COLORS.default;
    const organizerColor = item.organizerColor || "#c4c4c4";
    const placeholderLabel = item.is_munch || item.munch_id ? "Munch" : "Event";
    const displayPrice = item.short_price || item.price;

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onPress(item);
        }
    };

    const promoLabel = promoCode
        ? promoCode.discount_type === "percent"
            ? `${promoCode.discount}% off`
            : `$${promoCode.discount} off`
        : null;

    return (
        <div
            className={styles.eventCard}
            onClick={() => onPress(item)}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
            aria-label={`Open event ${item.name}`}
        >
            <div
                className={styles.typeRail}
                style={{ backgroundColor: eventRailColor }}
            />
            <div className={styles.poster}>
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={item.name}
                        className={styles.posterImage}
                        loading="lazy"
                        decoding="async"
                    />
                ) : (
                    <div className={styles.posterPlaceholder}>
                        <span className={styles.placeholderText}>{placeholderLabel}</span>
                    </div>
                )}
                <div className={styles.posterGradient} />
                {promoLabel && <div className={styles.discountBadge}>{promoLabel}</div>}
                <div className={styles.posterFooter}>
                    <div className={styles.eventTitle}>{item.name}</div>
                    <div className={styles.organizerRow}>
                        <span
                            className={styles.organizerDot}
                            style={{ backgroundColor: organizerColor }}
                        />
                        <span className={styles.organizerName}>
                            {item.organizer?.name || "Organizer"}
                        </span>
                    </div>
                </div>
            </div>
            <div className={styles.metaRow}>
                <div className={styles.metaItem}>
                    <CalendarIcon className={styles.metaIcon} />
                    <span>{formattedDate}</span>
                </div>
                {locationLabel ? (
                    <div className={styles.metaItem}>
                        <MapPinIcon className={styles.metaIcon} />
                        <span>{locationLabel}</span>
                    </div>
                ) : null}
                {displayPrice ? (
                    <div className={styles.metaItem}>
                        <TagIcon className={styles.metaIcon} />
                        <span>{displayPrice}</span>
                    </div>
                ) : null}
            </div>
            {tagChips.length > 0 && (
                <div className={styles.tagRow}>
                    {tagChips.map((tag) => {
                        const colors = getTagChipTone(tag);
                        return (
                            <span
                                key={`${item.id}-${tag.label}`}
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
        </div>
    );
};
