import styles from './PrivacyPolicy.module.css';

interface PrivacyPolicyProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivacyPolicy({ isOpen, onClose }: PrivacyPolicyProps) {
  if (!isOpen) return null;

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.dialog}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>PRIVACY & DISCLOSURE</h2>
          <button className={styles.closeButton} onClick={onClose} type="button">
            X
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Affiliate Disclosure</h3>
            <p className={styles.text}>
              As an Amazon Associate I earn from qualifying purchases. When you click on book
              links and make a purchase on Audible, we may receive a small commission at no
              additional cost to you.
            </p>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Data Collection</h3>
            <p className={styles.text}>
              We collect anonymous usage data to improve recommendations:
            </p>
            <ul className={styles.list}>
              <li>Impressions (which books are shown)</li>
              <li>Clicks (which books you explore on Audible)</li>
              <li>Wishlist additions and removals</li>
            </ul>
            <p className={styles.text}>
              No personal information is collected or stored on our servers.
            </p>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Local Storage</h3>
            <p className={styles.text}>
              Your wishlist, achievements, and preferences are stored locally in your browser
              using localStorage. This data never leaves your device and can be cleared at
              any time through your browser settings.
            </p>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Third-Party Links</h3>
            <p className={styles.text}>
              This site contains links to Audible.com, an Amazon company. When you visit
              Audible through our links, their privacy policy applies to any data they collect.
            </p>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Contact</h3>
            <p className={styles.text}>
              Questions about this policy? Reach out via GitHub Issues on our project repository.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
