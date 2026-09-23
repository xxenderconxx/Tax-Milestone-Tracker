import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import styles from './ReceiptUploadModal.module.css';

export default function ReceiptUploadModal({ item, type, isOpen, onClose, onUploadSuccess, accessToken }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  if (!item) return null;

  const handleFileChange = (e) => {
    setError('');
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Invalid file type! Please select a PNG image, JPG image, or PDF document.');
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit.');
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    setFile(selectedFile);

    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result);
      reader.readAsDataURL(selectedFile);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a receipt file to upload.');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('receipt', file);
      if (type === 'obligation') {
        formData.append('taxObligationId', item.id);
      } else {
        formData.append('milestoneId', item.id);
      }

      const res = await fetch('/api/receipts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload receipt.');
      }

      setFile(null);
      setPreviewUrl(null);
      onUploadSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} title={`Upload Proof of Payment`} onClose={onClose}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.targetBanner}>
          <span className={styles.targetLabel}>Target Item:</span>
          <strong className={styles.targetTitle}>
            {type === 'obligation' ? item.tax_type : item.title}
          </strong>
        </div>

        {error && <div className={styles.errorAlert}>{error}</div>}

        <div className={styles.uploadBox}>
          <label htmlFor="receiptFileInput" className={styles.fileLabel}>
            📁 Choose PNG, JPG, or PDF file
          </label>
          <input
            id="receiptFileInput"
            type="file"
            accept="image/png,image/jpeg,application/pdf"
            onChange={handleFileChange}
            className={styles.fileInput}
          />
          {file && (
            <div className={styles.fileSummary}>
              <span>Selected: <strong>{file.name}</strong> ({Math.round(file.size / 1024)} KB)</span>
            </div>
          )}
        </div>

        {previewUrl && (
          <div className={styles.previewContainer}>
            <span className={styles.previewTitle}>Image Preview:</span>
            <img src={previewUrl} alt="Receipt Preview" className={styles.previewImg} />
          </div>
        )}

        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isUploading} disabled={!file}>
            Submit Receipt
          </Button>
        </div>
      </form>
    </Modal>
  );
}

