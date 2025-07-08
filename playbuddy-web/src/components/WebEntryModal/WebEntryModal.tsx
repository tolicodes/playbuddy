import styles from './WebEntryModal.module.css';

const STORE_URL = 'https://l.playbuddy.me/ehjZ9IHqQUb'

const WebEntryModal = ({ onClose }: { onClose: () => void }) => {
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isAndroid = /Android/i.test(navigator.userAgent);
    const neither = !isIOS && !isAndroid;


    return (
        <div className={styles.wrapper}>
            <div className={styles.logo} />

            <div className={styles.title}>Download the PlayBuddy App</div>

            <div className={styles.storeButtons}>
                {(isIOS || neither) && (
                    <a href={STORE_URL} target="_blank" rel="noopener noreferrer">
                        <img
                            className={styles.storeImage}
                            src="https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us?size=250x83"
                            alt="Download on the App Store"
                        />
                    </a>
                )}
                {(isAndroid || neither) && (
                    <a href={STORE_URL} target="_blank" rel="noopener noreferrer">
                        <img
                            style={{ marginLeft: 10, height: 65, width: 160 }}
                            className={styles.storeImage}
                            src="https://play.google.com/intl/en_us/badges/images/generic/en_badge_web_generic.png"
                            alt="Get it on Google Play"
                        />
                    </a>
                )}
            </div>

            <div>
                <a className={styles.webLink} onClick={onClose}>Proceed to Web (Limited)</a>
            </div>

            <div className={styles.note}>
                <div className={styles.important}>Only In App</div>
                <div>❤️ Wishlist sync</div>
                <div>🧑 Follow organizers</div>
                <div>📅 RSVP to play parties</div>
                <div>🏷️ Unlock promo codes</div>
            </div>

            <div className={styles.important}>📋 Heads Up: Allow Paste</div>

            <div className={styles.promoInstruction}>
                When prompted, tap <strong>“Allow Paste”</strong> to instantly unlock your promo code.
            </div>


        </div>
    );
};

export default WebEntryModal;
