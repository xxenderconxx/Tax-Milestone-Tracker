import React from 'react';
import styles from './SearchBar.module.css';

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Search by client name or TIN...',
  className = ''
}) {
  return (
    <div className={`${styles.searchWrapper} ${className}`}>
      <span className={styles.icon}>🔍</span>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={styles.input}
      />
      {value && (
        <button
          type="button"
          className={styles.clearBtn}
          onClick={() => onChange({ target: { value: '' } })}
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  );
}

