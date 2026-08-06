import React, { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, ServerCrash } from 'lucide-react';
import { PaginationComponent } from '../../components';
import { apiRequest } from '../../utils/api';
import { useToast } from '../../contexts';

interface SystemLog { id: number; level: string; method: string; path: string; statusCode: number; message: string; requestId?: string; traceId?: string; createdAt: string; }
interface SystemLogResponse { data: SystemLog[]; pagination?: { total: number; total_pages: number }; }

export const SystemLogs: React.FC = () => {
  const { error: toastError } = useToast();
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [level, setLevel] = useState('');
  const [statusCode, setStatusCode] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (level) params.set('level', level);
      if (statusCode) params.set('statusCode', statusCode);
      const response = await apiRequest<SystemLogResponse>(`/cms/system-logs?${params.toString()}`, 'GET', undefined, { envelope: true });
      setLogs(response?.data || []);
      setTotal(response?.pagination?.total || 0);
      setTotalPages(Math.max(1, response?.pagination?.total_pages || 1));
    } catch (error: any) {
      toastError('Không thể tải nhật ký hệ thống', error?.message || 'Đã xảy ra lỗi khi tải dữ liệu.');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, [page, limit, level, statusCode]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12 text-[#1b1c1b]">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs md:flex-row md:items-center md:justify-between">
        <div><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-600"><ServerCrash size={15} /> Giám sát hệ thống</div><h1 className="text-2xl font-black tracking-tight text-slate-900">Nhật ký lỗi API</h1><p className="mt-1 text-xs text-slate-500">Theo dõi lỗi xác thực, dữ liệu và máy chủ để xử lý sự cố nhanh hơn.</p></div>
        <button type="button" onClick={fetchLogs} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Làm mới</button>
      </div>
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-5">
          <select value={level} onChange={(event) => { setLevel(event.target.value); setPage(1); }} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700"><option value="">Tất cả mức độ</option><option value="WARN">Cảnh báo</option><option value="ERROR">Lỗi nghiêm trọng</option></select>
          <select value={statusCode} onChange={(event) => { setStatusCode(event.target.value); setPage(1); }} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700"><option value="">Tất cả mã HTTP</option><option value="401">401 - Chưa xác thực</option><option value="403">403 - Không có quyền</option><option value="404">404 - Không tìm thấy</option><option value="500">500 - Lỗi máy chủ</option></select>
        </div>
        {loading ? <div className="p-12 text-center text-xs font-semibold text-slate-500">Đang tải nhật ký...</div> : logs.length === 0 ? <div className="p-12 text-center text-xs font-semibold text-slate-500">Chưa có lỗi API được ghi nhận.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Thời gian</th><th className="px-5 py-3">Mức độ</th><th className="px-5 py-3">Yêu cầu</th><th className="px-5 py-3">Mã</th><th className="px-5 py-3">Thông báo</th></tr></thead><tbody className="divide-y divide-slate-100">{logs.map((log) => <tr key={log.id} className="align-top hover:bg-slate-50/70"><td className="whitespace-nowrap px-5 py-4 text-slate-600">{new Date(log.createdAt).toLocaleString('vi-VN')}</td><td className="px-5 py-4"><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black ${log.level === 'ERROR' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}><AlertTriangle size={11} /> {log.level === 'ERROR' ? 'Lỗi' : 'Cảnh báo'}</span></td><td className="px-5 py-4 font-mono text-[11px] text-slate-700">{log.method} {log.path}</td><td className="px-5 py-4 font-black text-slate-700">{log.statusCode}</td><td className="max-w-[360px] break-words px-5 py-4 text-slate-500">{log.message}</td></tr>)}</tbody></table></div>}
        <PaginationComponent currentPage={page} totalPages={totalPages} totalItems={total} itemsPerPage={limit} onPageChange={setPage} onItemsPerPageChange={(value) => { setLimit(value); setPage(1); }} />
      </div>
    </div>
  );
};
