import React from 'react';
import styles from './AuditLogTable.module.css';
import DataTable from '../ui/DataTable';
import Pagination from '../ui/Pagination';

export default function AuditLogTable({ auditLogs, pagination, onPageChange, isLoading }) {
  const columns = [
    {
      header: 'Timestamp',
      accessor: (row) => (
        <span className={styles.timestamp}>
          {new Date(row.created_at).toLocaleString('en-PH')}
        </span>
      )
    },
    {
      header: 'Actor',
      accessor: (row) => (
        <div className={styles.actorCell}>
          <span className={styles.actorEmail}>{row.actor_email || 'System'}</span>
          {row.actor_role && <span className={styles.actorRole}>{row.actor_role}</span>}
        </div>
      )
    },
    {
      header: 'Action',
      accessor: (row) => (
        <span className={`${styles.actionTag} ${styles[row.action] || ''}`}>
          {row.action}
        </span>
      )
    },
    {
      header: 'Target Type',
      accessor: (row) => <span className={styles.typeTag}>{row.target_type}</span>
    },
    {
      header: 'Details / Metadata',
      accessor: (row) => (
        <pre className={styles.metadata}>
          {typeof row.metadata === 'object'
            ? JSON.stringify(row.metadata, null, 1)
            : row.metadata}
        </pre>
      )
    }
  ];

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Immutable System Audit Log</h3>
      <DataTable
        columns={columns}
        data={auditLogs}
        isLoading={isLoading}
        emptyMessage="No audit log entries recorded yet."
      />
      {pagination && pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
