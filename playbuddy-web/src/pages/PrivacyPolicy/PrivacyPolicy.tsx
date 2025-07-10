import ReactMarkdown from 'react-markdown';
import styles from './PrivacyPolicy.module.css';

const POLICY_MD = `# **PlayBuddy Privacy Policy**

**Effective Date:** 7/10/25

PlayBuddy is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your personal information when you use our mobile app, website, or any related services (collectively, “PlayBuddy”).

We designed PlayBuddy to help you discover events and build authentic, consent-based connections — while giving you control over your data.

---

## **1. What We Collect**

### _Account Information_

- Email address
- Username or display name
- Profile photo, bio, and preferences (e.g. interests, kinks, location area)
- Optional: community affiliations, event RSVPs, buddy list

### _Event Interactions_

- Events you view, RSVP to, or save to your wishlist
- Ticket links clicked (only tracked anonymously unless tied to a profile)
- Event feedback or ratings (if submitted)

### _Device & App Data_

- Device ID and OS type (for performance & security)
- IP address and city-level location (used to show nearby events)
- Usage patterns (e.g. what features are used, error logs)

### _Third-Party Integrations_

- If you sign up or interact via a third party (e.g., ticket site, community login), we may receive limited info per your authorization.

---

## **2. How We Use Your Data**

We use your data to:

- Recommend events and communities tailored to your preferences
- Help organizers understand and improve their events
- Personalize your app experience and buddy suggestions
- Communicate with you (e.g., notifications, event reminders)
- Improve app performance, debug issues, and prevent abuse

We _never_ sell your data or use it to serve third-party ads.

---

## **3. How We Share Your Data**

We may share limited data only when necessary, including:

- With event organizers **only if you RSVP or follow them**
- With trusted service providers who help us run the platform (e.g., hosting, analytics)
- If required by law or to protect PlayBuddy and its users

We **don’t** share your private profile data, interests, or RSVP history with anyone you haven’t explicitly connected with.

---

## **4. Your Rights and Choices**

You have full control over your PlayBuddy experience:

- **Edit or delete your profile** at any time
- **Request a copy** of your personal data
- **Opt out** of most notifications
- **Delete your account**, which removes your data from our systems within 30 days

Email us at \[[privacy@playbuddy.me](mailto:privacy@playbuddy.me)] to request data deletion or access.

---

## **5. Data Storage and Security**

- All data is stored securely using industry-standard encryption.
- Sensitive data (e.g. auth tokens) is encrypted at rest and in transit.
- We retain only the minimum data needed to provide services.

---

## **6. Location and Age Limits**

- PlayBuddy is intended for users aged 18+.
- Currently, we focus on events in the United States but may expand to other regions.

---

## **7. Updates to This Policy**

We may update this Privacy Policy as our platform evolves. If we make significant changes, we’ll notify users via email or in-app.

---

## **8. Contact Us**

If you have questions or concerns about this Privacy Policy, please reach out:

**Email:** [privacy@playbuddy.me](mailto:privacy@playbuddy.me)
**Mail:** PlayBuddy, \[insert mailing address if needed]

---

Would you like:

- a **shorter version** for in-app onboarding?
- a **legalese version** for app store submission?
- help writing a **Terms of Use**?

Let me know.
`


export default function PrivacyPolicy() {
  return (
    <div className={styles.container}>
      <ReactMarkdown>
        {POLICY_MD}
      </ReactMarkdown>
    </div >
  );
}
