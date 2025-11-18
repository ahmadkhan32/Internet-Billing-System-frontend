import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../utils/constants';
import { formatCurrency, formatDate, formatDateTime, getStatusColor } from '../utils/helpers';

const Invoices = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showAutoGenerateModal, setShowAutoGenerateModal] = useState(false);
  const [selectedBillId, setSelectedBillId] = useState('');
  const [bills, setBills] = useState([]);

  const canGenerateInvoices = user?.role === ROLES.SUPER_ADMIN || 
                              user?.role === ROLES.ADMIN || 
                              user?.role === ROLES.ACCOUNT_MANAGER;

  useEffect(() => {
    fetchInvoices();
    if (canGenerateInvoices) {
      fetchBills();
    }
  }, [statusFilter]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/invoices', {
        params: { status: statusFilter, limit: 50 }
      });
      setInvoices(response.data.invoices || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      alert('Error fetching invoices');
    } finally {
      setLoading(false);
    }
  };

  const fetchBills = async () => {
    try {
      const response = await apiClient.get('/bills', {
        params: { limit: 1000 }
      });
      setBills(response.data.bills || []);
    } catch (error) {
      console.error('Error fetching bills:', error);
    }
  };

  const handleAutoGenerate = async (billId) => {
    try {
      await apiClient.post(`/invoices/auto-generate/${billId}`);
      alert('Invoice generated successfully!');
      fetchInvoices();
      setShowAutoGenerateModal(false);
      setSelectedBillId('');
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert(error.response?.data?.message || 'Error generating invoice');
    }
  };

  const handleRegenerate = async (invoiceId) => {
    if (!window.confirm('Are you sure you want to regenerate this invoice? A new invoice number will be generated.')) {
      return;
    }
    try {
      await apiClient.post(`/invoices/${invoiceId}/regenerate`);
      alert('Invoice regenerated successfully!');
      fetchInvoices();
    } catch (error) {
      console.error('Error regenerating invoice:', error);
      alert(error.response?.data?.message || 'Error regenerating invoice');
    }
  };

  const handleDownloadInvoice = async (billId) => {
    try {
      const response = await apiClient.get(`/bills/${billId}/invoice`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${billId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading invoice:', error);
      alert('Failed to download invoice');
    }
  };

  const getInvoiceStatusBadge = (status, paymentPercentage) => {
    if (status === 'paid' || status === 'completed') {
      return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">✅ Completed</span>;
    } else if (status === 'partial' || (paymentPercentage > 0 && paymentPercentage < 100)) {
      return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">🟡 Partial</span>;
    } else {
      return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">🔴 Pending</span>;
    }
  };

  if (loading && invoices.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Invoices</h1>
        {canGenerateInvoices && (
          <button
            onClick={() => setShowAutoGenerateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            ⚡ Auto Generate Invoice
          </button>
        )}
      </div>

      <div className="card mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="partial">Partial</option>
          <option value="paid">Completed</option>
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Total Amount</th>
              <th>Paid</th>
              <th>Remaining</th>
              <th>Paid %</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length > 0 ? (
              invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="font-medium">{invoice.invoiceNumber || invoice.bill_number}</td>
                  <td>{invoice.customer?.name || 'N/A'}</td>
                  <td>{formatDate(invoice.invoiceDate || invoice.createdAt)}</td>
                  <td className="font-semibold">{formatCurrency(invoice.total_amount || invoice.amount)}</td>
                  <td>
                    <span className={invoice.paidAmount > 0 ? 'text-green-600 font-medium' : 'text-gray-500'}>
                      {formatCurrency(invoice.paidAmount || 0)}
                    </span>
                  </td>
                  <td>
                    <span className={invoice.remainingAmount > 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                      {formatCurrency(invoice.remainingAmount || 0)}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-[60px]">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            invoice.paymentPercentage >= 100 
                              ? 'bg-green-500' 
                              : invoice.paymentPercentage > 0 
                              ? 'bg-blue-500' 
                              : 'bg-gray-300'
                          }`}
                          style={{ width: `${Math.min(invoice.paymentPercentage || 0, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-700 min-w-[45px]">
                        {(invoice.paymentPercentage || 0).toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-col gap-1">
                      {getInvoiceStatusBadge(invoice.invoiceStatus || invoice.status, invoice.paymentPercentage || 0)}
                      {invoice.completionTimestamp && (
                        <span className="text-xs text-gray-500">
                          Completed: {formatDateTime(invoice.completionTimestamp)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownloadInvoice(invoice.id)}
                        className="text-primary-600 hover:text-primary-800 text-sm"
                        title="Download PDF"
                      >
                        📄 PDF
                      </button>
                      <Link
                        to={`/bills/${invoice.id}`}
                        className="text-primary-600 hover:text-primary-800 text-sm"
                        title="View Details"
                      >
                        👁️ View
                      </Link>
                      {canGenerateInvoices && (
                        <button
                          onClick={() => handleRegenerate(invoice.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                          title="Regenerate Invoice"
                        >
                          🔄 Regen
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" className="text-center py-8 text-gray-500">
                  No invoices found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Auto Generate Invoice Modal */}
      {showAutoGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Auto Generate Invoice</h2>
            <p className="text-sm text-gray-600 mb-4">
              Select a bill to generate an invoice. The invoice will be automatically calculated with current payment status.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Bill *
              </label>
              <select
                value={selectedBillId}
                onChange={(e) => setSelectedBillId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a bill...</option>
                {bills
                  .filter(bill => bill.customer) // Only show bills with customers
                  .map((bill) => (
                    <option key={bill.id} value={bill.id}>
                      {bill.bill_number} - {bill.customer?.name || 'N/A'} - {formatCurrency(bill.total_amount || bill.amount)}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleAutoGenerate(selectedBillId)}
                disabled={!selectedBillId}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Generate Invoice
              </button>
              <button
                onClick={() => {
                  setShowAutoGenerateModal(false);
                  setSelectedBillId('');
                }}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;

