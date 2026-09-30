import React from 'react';
import styles from './StaffTable.module.css';
import DataTable from '../ui/DataTable';
import Button from '../ui/Button';

export default function StaffTable({ users, pendingInvites, onToggleStatus, onDeleteUser, currentUser }) {
  const userColumns = [
    {
      header: 'Email Address',
      accessor: (row) => (
        <div className={styles.emailCell}>
          <span className={styles.emailText}>{row.email}</span>
          {row.id === currentUser?.id && <span className={styles.youBadge}>(You)</span>}
        </div>
      )
    },
    {
      header: 'Role',
      accessor: (row) => (
        <span className={`${styles.roleTag} ${row.role === 'ADMIN' ? styles.adminRole : styles.staffRole}`}>
          {row.role}
        </span>
      )
    },
    {
      header: 'Status',
      accessor: (row) => (
        <span className={`${styles.statusTag} ${row.is_active ? styles.activeStatus : styles.inactiveStatus}`}>
          {row.is_active ? '● Active' : '○ Deactivated'}
        </span>
      )
    },
    {
      header: 'Joined Date',
      accessor: (row) => (
        <span className={styles.dateText}>
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      )
    },
    {
      header: 'Actions',
      accessor: (row) => {
        if (row.id === currentUser?.id) return <span className={styles.na}>—</span>;
        return (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button
              variant={row.is_active ? 'secondary' : 'outline'}
              size="small"
              onClick={() => onToggleStatus(row.id, !row.is_active)}
            >
              {row.is_active ? 'Deactivate' : 'Reactivate'}
            </Button>
            <Button
              variant="danger"
              size="small"
              onClick={() => onDeleteUser && onDeleteUser(row.id, row.email)}
            >
              Delete
            </Button>
          </div>
        );
      }
    }
  ];

  const inviteColumns = [
    {
      header: 'Invited Email',
      accessor: 'email'
    },
    {
      header: 'Assigned Role',
      accessor: (row) => (
        <span className={`${styles.roleTag} ${row.role === 'ADMIN' ? styles.adminRole : styles.staffRole}`}>
          {row.role}
        </span>
      )
    },
    {
      header: 'Expires At',
      accessor: (row) => (
        <span className={styles.dateText}>
          {new Date(row.expires_at).toLocaleString()}
        </span>
      )
    },
    {
      header: 'Status',
      accessor: () => <span className={styles.pendingBadge}>Pending Redemption</span>
    }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Active Team Members</h3>
        <DataTable columns={userColumns} data={users} emptyMessage="No team members found." />
      </div>

      {pendingInvites && pendingInvites.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Pending Invitations ({pendingInvites.length})</h3>
          <DataTable columns={inviteColumns} data={pendingInvites} emptyMessage="No pending invites." />
        </div>
      )}
    </div>
  );
}
