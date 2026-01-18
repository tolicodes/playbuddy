import styles from "./EventListItem.module.css";
import type { KeyboardEvent } from "react";
import { getBestPromoCode } from "../../../../playbuddy-mobile/utils/getBestPromoCode";
import { formatDate } from "../../../../playbuddy-mobile/utils/formatDate";
import type { EventWithMetadata } from "./util/types";
import { ACTIVE_EVENT_TYPES, FALLBACK_EVENT_TYPE } from "../../../../common/src/types/commonTypes";
import { getTagChipTone } from "./util/tagUtils";

const EVENT_FALLBACK_GRADIENTS: Record<string, [string, string]> = {
    event: ["#F7F5FF", "#E7DEFF"],
    play_party: ["#F3EEFF", "#E7DEFF"],
    munch: ["#FFFAF0", "#FFF8D6"],
    retreat: ["#F6F7F9", "#F7F5FF"],
    festival: ["#F3F7FF", "#DCE5FF"],
    conference: ["#F3F7FF", "#DCE5FF"],
    workshop: ["#FFF1F2", "#FFF5F6"],
};

const TYPE_LABEL_MAP: Record<string, string> = {
    event: "Event",
    play_party: "Play Party",
    munch: "Munch",
    retreat: "Retreat",
    festival: "Festival",
    conference: "Conference",
    workshop: "Workshop",
};

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
    const locationLabel = (item.neighborhood || "").trim();
    const organizerName = item.organizer?.name?.trim() || "Organizer";
    const displayPrice = item.short_price || item.price || "";
    const metaLine = [formattedDate, locationLabel, displayPrice].filter(Boolean).join(" - ");

    const isActiveEventType = (value?: string | null) =>
        !!value && ACTIVE_EVENT_TYPES.includes(value as (typeof ACTIVE_EVENT_TYPES)[number]);
    const resolvedType = item.play_party || item.type === "play_party"
        ? "play_party"
        : item.is_munch || item.munch_id || item.type === "munch"
            ? "munch"
            : item.type && isActiveEventType(item.type)
                ? item.type
                : FALLBACK_EVENT_TYPE;
    const primaryTypeLabel = TYPE_LABEL_MAP[resolvedType] || resolvedType.replace(/_/g, " ");
    const extraTags = [...(item.classification?.tags || []), ...(item.tags || [])];
    const normalizedTypeLabel = primaryTypeLabel.trim().toLowerCase();
    const primaryTagLabel =
        extraTags
            .map((tag) => tag.trim())
            .find((tag) => tag && tag.toLowerCase() !== normalizedTypeLabel) || "";
    const displayTypeLabel = resolvedType === FALLBACK_EVENT_TYPE ? "" : primaryTypeLabel;
    const typeTagLabel = displayTypeLabel
        ? primaryTagLabel
            ? `${displayTypeLabel} | ${primaryTagLabel}`
            : displayTypeLabel
        : primaryTagLabel;
    const typeKey = (displayTypeLabel || primaryTypeLabel).trim().toLowerCase();
    const typeTagColors = getTagChipTone({ label: typeKey, kind: "type" });
    const fallbackGradient = EVENT_FALLBACK_GRADIENTS[resolvedType] ?? EVENT_FALLBACK_GRADIENTS.event;

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
                    <div
                        className={styles.posterPlaceholder}
                        style={{
                            backgroundImage: `linear-gradient(135deg, ${fallbackGradient[0]}, ${fallbackGradient[1]})`,
                        }}
                    >
                        <span className={styles.placeholderText}>{primaryTypeLabel}</span>
                    </div>
                )}
                {promoLabel && <div className={styles.discountBadge}>{promoLabel}</div>}
                {typeTagLabel && (
                    <div
                        className={styles.typeTagBadge}
                        style={{
                            backgroundColor: typeTagColors.background,
                            borderColor: typeTagColors.border,
                        }}
                    >
                        <span
                            className={styles.typeTagText}
                            style={{ color: typeTagColors.text }}
                        >
                            {typeTagLabel}
                        </span>
                    </div>
                )}
            </div>
            <div className={styles.detailsPanel}>
                <div className={styles.eventTitle}>{item.name}</div>
                <div className={styles.organizerName}>{organizerName}</div>
                {metaLine ? (
                    <div className={styles.metaText}>{metaLine}</div>
                ) : null}
            </div>
        </div>
    );
};
