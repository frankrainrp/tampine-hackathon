import styles from '../MomRenewal.module.css';
import type { MomRenewalState } from '../MomRenewal';

interface Props {
  state: MomRenewalState;
  update: (patch: Partial<MomRenewalState>) => void;
  onBack: () => void;
  onNext: () => void;
}

export default function Step3Upload({ state, update, onBack, onNext }: Props) {
  const valid = state.passportUploaded && state.photoUploaded;

  return (
    <div data-agent-id="page-upload">
      <h1 className={styles.pageTitle}>Upload Documents</h1>
      <p className={styles.pageSubtitle}>
        Provide a soft copy of the passport bio-page and a recent passport photo. Files must
        be under 2 MB each.
      </p>

      <div className={styles.formGroup}>
        <label className={`${styles.label} ${styles.labelRequired}`}>Passport Bio-Page</label>
        <div
          className={`${styles.uploadBox} ${state.passportUploaded ? styles.uploadDone : ''}`}
          data-agent-id="upload-passport"
          onClick={() => update({ passportUploaded: true })}
          role="button"
          tabIndex={0}
        >
          <svg className={styles.uploadIcon} viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
          <div className={styles.uploadLabel}>
            {state.passportUploaded ? 'Passport uploaded' : 'Click to upload passport'}
          </div>
          <div className={styles.uploadHelp}>PDF or JPG, max 2 MB</div>
          {state.passportUploaded && (
            <div className={styles.uploadedFile} data-agent-id="uploaded-passport-file">
              ✓ passport-biopage.pdf · 1.4 MB
            </div>
          )}
        </div>
      </div>

      <div className={styles.formGroup}>
        <label className={`${styles.label} ${styles.labelRequired}`}>Passport-Size Photo</label>
        <div
          className={`${styles.uploadBox} ${state.photoUploaded ? styles.uploadDone : ''}`}
          data-agent-id="upload-photo"
          onClick={() => update({ photoUploaded: true })}
          role="button"
          tabIndex={0}
        >
          <svg className={styles.uploadIcon} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm0 2c-2.21 0-4 1.79-4 4v2h8v-2c0-2.21-1.79-4-4-4z" />
          </svg>
          <div className={styles.uploadLabel}>
            {state.photoUploaded ? 'Photo uploaded' : 'Click to upload photo'}
          </div>
          <div className={styles.uploadHelp}>JPG, white background, 35 × 45 mm</div>
          {state.photoUploaded && (
            <div className={styles.uploadedFile} data-agent-id="uploaded-photo-file">
              ✓ worker-photo.jpg · 320 KB
            </div>
          )}
        </div>
      </div>

      <div className={styles.btnRow}>
        <button className={styles.btnSecondary} data-agent-id="btn-back" onClick={onBack}>
          Back
        </button>
        <button
          className={styles.btnPrimary}
          data-agent-id="btn-next"
          onClick={onNext}
          disabled={!valid}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
