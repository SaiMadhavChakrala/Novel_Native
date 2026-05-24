import styles from "./styles/Loading.module.css";

export default function Loading() {
  return (
    <div className={styles.shell} role="status" aria-live="polite" aria-label="Loading page">
      <div className={styles.loader}>
        <div className={styles.brand}>WebNovelHub</div>
        <div className={styles.ring} aria-hidden="true" />
        <p>Loading page</p>
        <div className={styles.skeleton} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
