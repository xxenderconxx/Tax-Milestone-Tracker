import React from 'react';
import DataTable from '../ui/DataTable';
import StatusBadge from '../ui/StatusBadge';
import styles from './ClientListTable.module.css';

export default function ClientListTable({ clients = [], isLoading, onClientClick }) {
  const columns = [
    {
      header: 'Business Name',
      accessor: 'name',
      render: (client) => (
        <div className={styles.nameCell}>
          <span className={styles.clientName}>{client.name}</span>
          <span className={styles.businessType}>{client.business_type}</span>
        </div>
      )
    },
    {
      header: 'TIN',
      accessor: 'tin',
      render: (client) => <code className={styles.tin}>{client.tin}</code>
    },
    {
      header: 'Status',
      accessor: 'approval_status',
      render: (client) => {
        if (client.is_archived) {
          return <StatusBadge status="REJECTED" label="Archived" size="sm" />;
        }
        if (client.approval_status === 'PENDING') {
          return <StatusBadge status="UNDER_REVIEW" label="Pending Approval" size="sm" />;
        }
        if (client.approval_status === 'REJECTED') {
          return <StatusBadge status="REJECTED" label="Rejected" size="sm" />;
        }
        return <StatusBadge status="VERIFIED" label="Active" size="sm" />;
      }
    },
    {
      header: 'Created Date',
      accessor: 'created_at',
      render: (client) => new Date(client.created_at).toLocaleDateString('en-PH')
    }
  ];

  return (
    <DataTable
      columns={columns}
      data={clients}
      isLoading={isLoading}
      onRowClick={onClientClick}
      emptyMessage="No clients found matching your query."
    />
  );
}

