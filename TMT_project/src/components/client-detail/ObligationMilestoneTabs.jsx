import React from 'react';
import styles from './ObligationMilestoneTabs.module.css';

export default function ObligationMilestoneTabs({ activeTab, onTabChange, counts }) {
  return (
    <div className={styles.tabContainer}>
      <button
        className={`${styles.tabBtn} ${activeTab === 'obligations' ? styles.activeTab : ''}`}
        onClick={() => onTabChange('obligations')}
      >
        📋 Tax Obligations ({counts.obligations})
      </button>

      <button
        className={`${styles.tabBtn} ${activeTab === 'milestones' ? styles.activeTab : ''}`}
        onClick={() => onTabChange('milestones')}
      >
        💰 Payment Milestones ({counts.milestones})
      </button>
    </div>
  );
}

