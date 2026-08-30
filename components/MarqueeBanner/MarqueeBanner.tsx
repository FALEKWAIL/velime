import styles from './MarqueeBanner.module.css';

const items = ['STYLE', 'QUALITÉ', 'NOUVELLE COLLECTION', 'ÉLÉGANCE', 'VELIME'];

export default function MarqueeBanner() {
  return (
    <div className={styles.banner} id="marquee-banner">
      <div className={styles.track}>
        <div className={styles.content}>
          {[...items, ...items, ...items].map((item, i) => (
            <span key={i} className={styles.item}>
              <span className={styles.dot}>•</span>
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
