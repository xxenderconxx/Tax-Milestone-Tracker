import React from 'react';
import styles from './DataTable.module.css';

export default function DataTable({ columns, data, onRowClick, isLoading = false, emptyMessage = 'No records found.' }) {
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Loading table data...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <div className={styles.emptyContainer}>{emptyMessage}</div>;
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} style={{ width: col.width || 'auto', textAlign: col.align || 'left' }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rIdx) => (
            <tr
              key={row.id || rIdx}
              onClick={() => onRowClick && onRowClick(row)}
              className={onRowClick ? styles.clickableRow : ''}
            >
              {columns.map((col, cIdx) => (
                <td key={cIdx} style={{ textAlign: col.align || 'left' }}>
                  {col.render ? col.render(row) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

