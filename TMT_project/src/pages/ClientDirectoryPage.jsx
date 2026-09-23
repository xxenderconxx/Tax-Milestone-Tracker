import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ClientFilterBar from '../components/clients/ClientFilterBar';
import ClientListTable from '../components/clients/ClientListTable';
import AddClientModal from '../components/clients/AddClientModal';
import Pagination from '../components/ui/Pagination';
import Toast from '../components/ui/Toast';
import styles from './ClientDirectoryPage.module.css';

export default function ClientDirectoryPage({ accessToken }) {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [isArchived, setIsArchived] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const fetchClients = async (page = 1) => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        search,
        isArchived: isArchived.toString(),
        page: page.toString(),
        limit: '10'
      });
      const res = await fetch(`/api/clients?${query.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Failed to load client directory.');
      const data = await res.json();
      setClients(data.clients);
      setPagination(data.pagination);
    } catch (err) {
      setToastMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients(1);
  }, [search, isArchived, accessToken]);

  const handleAddClient = async (clientData) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(clientData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create client.');

      setToastMessage(`Client "${data.name}" registered successfully!`);
      setIsAddModalOpen(false);
      fetchClients(1);
    } catch (err) {
      setToastMessage(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Client Directory</h1>
        <p className={styles.subtitle}>Search and manage registered business entities and tax profiles</p>
      </div>

      <ClientFilterBar
        search={search}
        onSearchChange={setSearch}
        isArchived={isArchived}
        onToggleArchived={() => setIsArchived(!isArchived)}
        onAddClient={() => setIsAddModalOpen(true)}
      />

      <ClientListTable
        clients={clients}
        isLoading={isLoading}
        onClientClick={(client) => navigate(`/clients/${client.id}`)}
      />

      <Pagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        onPageChange={(p) => fetchClients(p)}
      />

      <AddClientModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddClient}
        isLoading={isSubmitting}
      />

      <Toast message={toastMessage} type="info" onClose={() => setToastMessage('')} />
    </div>
  );
}

