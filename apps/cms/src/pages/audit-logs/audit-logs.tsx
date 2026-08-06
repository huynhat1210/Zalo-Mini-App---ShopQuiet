import React, { useEffect, useState } from 'react';
import { ClipboardList, RefreshCw, Search } from 'lucide-react';
import { PaginationComponent } from '../../components';
import { apiRequest } from '../../utils/api';
import { useToast } from '../../contexts';

interface AuditLog {
  id: number;
  adminId: string;
  action: string;
  details: string;
  createdAt: string;
}

interface AuditResponse {
  data: AuditLog[];
  pagination?: { total: number; total_pages: number };
}

export const AuditLogs: React.FC = () => {
  const { error: toastError } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [action, setAction] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (query.trim()) params.set('action', query.trim());
      const response = await apiRequest<AuditResponse>(`/cms/audit-logs?${params.toString()}`, 'GET', undefined, { envelope: true });
      setLogs(response?.data || []);
      setTotal(response?.pagination?.total || 0);
      setTotalPages(Math.max(1, response?.pagination?.total_pages || 1));
    } catch (error: any) {
      toastError('Không thể tải nhật ký', error?.message || 'Không thể tải lịch sử thao tác quản trị.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, limit, action]);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    setAction(query);
  };

  const formatDetails = (details: string) => {
    try {
      return JSON.stringify(JSON.parse(details), null, 2);
    } catch {
      return details;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn text-[#1b1c1b] pb-12">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0e6877]">
            <ClipboardList size={15} /> Kiểm soát quản trị
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Nhật ký thao tác</h1>
          <p className="mt-1 text-xs text-slate-500">Theo dõi thay đổi quan trọng do quản trị viên thực hiện trong hệ thống.</p>
        </div>
        <button type="button" onClick={fetchLogs} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Làm mới
        </button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
        <form onSubmit={submitSearch} className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Lọc theo hành động..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#0e6877] focus:bg-white" />
          </div>
          <button type="submit" className="rounded-xl bg-[#0e6877] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#0c5966]">Lọc nhật ký</button>
        </form>

        {loading ? (
          <div className="p-12 text-center text-xs font-semibold text-slate-500">Đang tải nhật ký...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-xs font-semibold text-slate-500">Chưa có thao tác nào được ghi nhận.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                <tr><th className="px-5 py-3">Thời gian</th><th className="px-5 py-3">Quản trị viên</th><th className="px-5 py-3">Hành động</th><th className="px-5 py-3">Chi tiết</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="align-top hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-600">{new Date(log.createdAt).toLocaleString('vi-VN')}</td>
                    <td className="px-5 py-4 font-semibold text-slate-700">{log.adminId}</td>
                    <td className="px-5 py-4"><span className="rounded-full border border-teal-100 bg-teal-50 px-2.5 py-1 text-[10px] font-black text-[#0e6877]">{log.action}</span></td>
                    <td className="max-w-[420px] whitespace-pre-wrap break-words px-5 py-4 font-mono text-[11px] text-slate-500">{formatDetails(log.details)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <PaginationComponent currentPage={page} totalPages={totalPages} totalItems={total} itemsPerPage={limit} onPageChange={setPage} onItemsPerPageChange={(value) => { setLimit(value); setPage(1); }} />
      </div>
    </div>
  );
};
