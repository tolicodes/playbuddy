import styles from './WebEntryModal.module.css';

const STORE_URL = 'https://l.playbuddy.me/ehjZ9IHqQUb'

const WebEntryModal = ({ onClose }: { onClose: () => void }) => {
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isAndroid = /Android/i.test(navigator.userAgent);
    const neither = !isIOS && !isAndroid;

    return (
        <div className={styles.wrapper} role="dialog" aria-live="polite">
            <div className={styles.popover}>
                <button
                    type="button"
                    className={styles.closeButton}
                    onClick={onClose}
                    aria-label="Dismiss app prompt"
                >
                    x
                </button>
                <div className={styles.header}>
                    <div className={styles.logoMark}>
                        <img src="/logo_white.png" alt="PlayBuddy" />
                    </div>
                    <div>
                        <div className={styles.title}>Get more in the app</div>
                        <div className={styles.subtitle}>
                            Wishlists, RSVPs, and promo codes live there.
                        </div>
                    </div>
                </div>

                <div className={styles.badges}>
                    {(isIOS || neither) && (
                        <a href={STORE_URL} target="_blank" rel="noreferrer">
                            <img
                                className={styles.storeImage}
                                src="https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us?size=250x83"
                                alt="Download on the App Store"
                            />
                        </a>
                    )}
                    {(isAndroid || neither) && (
                        <a href={STORE_URL} target="_blank" rel="noreferrer">
                            <img
                                className={styles.storeImage}
                                src="https://play.google.com/intl/en_us/badges/images/generic/en_badge_web_generic.png"
                                alt="Get it on Google Play"
                            />
                        </a>
                    )}
                </div>

                <div className={styles.perks}>
                    <span>Wishlist sync across devices</span>
                    <span>RSVP to play parties</span>
                    <span>Promo codes unlocked instantly</span>
                </div>

                <div className={styles.tip}>
                    Tip: allow paste to instantly unlock promo codes.
                </div>

                <button type="button" className={styles.webLink} onClick={onClose}>
                    Continue on web
                </button>
            </div>
        </div>
    );
};

export default WebEntryModal;
