import React, { useEffect, useState } from 'react';
import { fetchPayments } from '../services/api';
import type { Payment } from '../types';
import { Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

export const Transactions: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');

  const limit = 15;

  const loadData = () => {
    setLoading(true);
    fetchPayments(page, limit, { status: statusFilter, payment_method: methodFilter })
      .then((res) => {
        setPayments(res.data);
        setTotal(res.total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [page, statusFilter, methodFilter]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Merchant Transactions</h2>
        <p className="text-sm text-slate-400 mt-1">Real database records queried from Supabase backend</p>
      </div>

      {/* Filters Bar */}
      <div className="bg-[#131b29] border border-[#1f293d] p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-300">Filters:</span>
          
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="bg-[#0b0f17] border border-[#1f293d] text-xs text-slate-200 px-3 py-2 rounded-xl focus:outline-none focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="captured">Captured</option>
            <option value="failed">Failed</option>
          </select>

          <select
            value={methodFilter}
            onChange={(e) => { setMethodFilter(e.target.value); setPage(1); }}
            className="bg-[#0b0f17] border border-[#1f293d] text-xs text-slate-200 px-3 py-2 rounded-xl focus:outline-none focus:border-blue-500"
          >
            <option value="">All Methods</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="netbanking">Net Banking</option>
            <option value="wallet">Wallet</option>
          </select>
        </div>

        <div className="text-xs text-slate-400">
          Showing <span className="text-white font-medium">{payments.length}</span> of <span className="text-white font-medium">{total.toLocaleString()}</span> records
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#131b29] border border-[#1f293d] rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#0b0f17]/50 border-b border-[#1f293d] text-xs text-slate-400 uppercase font-semibold">
              <th className="p-4">Payment ID</th>
              <th className="p-4">Order ID</th>
              <th className="p-4">Customer ID</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Method</th>
              <th className="p-4">Status</th>
              <th className="p-4">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1f293d] text-xs text-slate-300">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">Loading transactions...</td>
              </tr>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">No transactions match filters</td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id} className="hover:bg-[#1f293d]/30 transition-colors">
                  <td className="p-4 font-mono text-blue-400">{p.id}</td>
                  <td className="p-4 font-mono">{p.order_id}</td>
                  <td className="p-4 font-mono text-slate-400">{p.customer_id}</td>
                  <td className="p-4 font-bold text-white">₹{p.amount.toFixed(2)}</td>
                  <td className="p-4 uppercase">{p.payment_method}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full font-medium ${
                      p.status === 'captured'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="p-4 text-slate-400">{new Date(p.created_at).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-[#1f293d] flex items-center justify-between bg-[#0b0f17]/30 text-xs">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-[#1f293d] disabled:opacity-40 hover:bg-[#1f293d]"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>
          
          <span className="text-slate-400">
            Page <span className="text-white font-medium">{page}</span> of <span className="text-white font-medium">{totalPages || 1}</span>
          </span>

          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-[#1f293d] disabled:opacity-40 hover:bg-[#1f293d]"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
