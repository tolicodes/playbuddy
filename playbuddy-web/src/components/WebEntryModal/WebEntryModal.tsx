// WebEntryPage.tsx
import React from 'react';
import styles from './WebEntryModal.module.css';
import { APP_STORE_URL, GOOGLE_PLAY_URL } from '@common/config';

import googlePlayIcon from '../../assets/google-app-icon.jpg';

const WebEntryModal = ({ onClose }: { onClose: () => void }) => {
    return (
        <div className={styles.pageWrapper}>
            <div className={styles.card}>
                {/* Header */}
                <div className={styles.header}>
                    <h1 className={styles.title}>Web’s a tease… 😉</h1>
                    <p className={styles.subtitle}>
                        The full experience lives in our iOS & Android apps.
                    </p>
                </div>

                {/* Download Buttons */}
                <div className={styles.buttons}>
                    <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
                        <img
                            src="https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us?size=250x83&releaseDate=1311120000&h=5b3127492d87ec2af62ff4d2a7492b70"
                            alt="Download on the App Store"
                            height="40"
                        />
                    </a>

                    <a href={GOOGLE_PLAY_URL} target="_blank" rel="noopener noreferrer">
                        <img
                            src={googlePlayIcon}
                            alt="Download on Google Play"
                            height="40"
                        />
                    </a>
                </div>

                {/* Feature List */}
                <div className={styles.features}>
                    <div className={styles.feature}>
                        <span className={styles.emoji}>❤️</span>
                        <div>
                            <h3 className={styles.featureTitle}>Wishlist & Google Calendar Sync</h3>
                            <p>Plan your week. Save what excites you. Sync to your calendar.</p>
                        </div>
                    </div>

                    <div className={styles.feature}>
                        <span className={styles.emoji}>🧑</span>
                        <div>
                            <h3 className={styles.featureTitle}>Follow Organizers & Facilitators</h3>
                            <p>All your fav events, all in one place.</p>
                        </div>
                    </div>

                    <div className={styles.feature}>
                        <span className={styles.emoji}>📅</span>
                        <div>
                            <h3 className={styles.featureTitle}>Munches, Festivals & Play Parties</h3>
                            <p>From warm hangouts to wild nights.</p>
                        </div>
                    </div>

                    <div className={styles.feature}>
                        <span className={styles.emoji}>🏷️</span>
                        <div>
                            <h3 className={styles.featureTitle}>Exclusive Promos</h3>
                            <p>Special discounts & private invites.</p>
                        </div>
                    </div>
                </div>

                {/* Footer CTA */}
                <div className={styles.footer}>
                    <h2 className={styles.tribe}>🌈 Welcome to our tribe.</h2>
                    <button className={styles.ctaButton} onClick={onClose}>Continue with limited web version</button>
                </div>
            </div>
        </div>
    );
};

export default WebEntryModal;