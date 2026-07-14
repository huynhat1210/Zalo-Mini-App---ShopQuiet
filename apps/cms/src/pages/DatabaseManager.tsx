import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiRequest } from '../utils/api';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  X, 
  Save, 
  Database,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';

export const DatabaseManager: React.FC = () => {
  const { modelName } = useParams<{ modelName: string }>();
  const navigate = useNavigate();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [error, setError] = useState('');

  // Dynamic form state
  const [formData, setFormData] = useState<Record<string, any>>({});

  const fetchRecords = async () => {
    if (!modelName) return;
    try {
      setLoading(true);
      const res = await apiRequest(`/cms/database/models/${modelName}`);
      setRecords(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error(`Failed to load records for model ${modelName}:`, err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    setIsModalOpen(false);
    setEditingRecord(null);
  }, [modelName]);

  // Extract columns dynamically from the first record, fallback to a basic schema
  const getColumns = () => {
    if (records.length === 0) return ['id'];
    // Filter out complex object relations or arrays, keep primitive fields
    return Object.keys(records[0]).filter(
      (key) => typeof records[0][key] !== 'object' || records[0][key] === null
    );
  };

  const columns = getColumns();

  const handleOpenAddModal = () => {
    setEditingRecord(null);
    const initialForm: Record<string, any> = {};
    columns.forEach((col) => {
      if (col === 'id' || col === 'createdAt' || col === 'updatedAt') return;
      
      // Guess initial value based on type of first record's value
      const sampleVal = records[0]?.[col];
      if (typeof sampleVal === 'number') {
        initialForm[col] = 0;
      } else if (typeof sampleVal === 'boolean') {
        initialForm[col] = true;
      } else {
        initialForm[col] = '';
      }
    });
    setFormData(initialForm);
    setIsModalOpen(true);
    setError('');
  };

  const handleOpenEditModal = (record: any) => {
    setEditingRecord(record);
    const initialForm: Record<string, any> = {};
    columns.forEach((col) => {
      if (col === 'id' || col === 'createdAt' || col === 'updatedAt') return;
      initialForm[col] = record[col] ?? '';
    });
    setFormData(initialForm);
    setIsModalOpen(true);
    setError('');
  };

  const handleDeleteRecord = async (id: string | number) => {
    if (!modelName) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bản ghi này của bảng ${modelName}?`)) return;
    try {
      await apiRequest(`/cms/database/models/${modelName}/${id}`, 'DELETE');
      setRecords(records.filter((r) => r.id !== id));
    } catch (err: any) {
      alert(err.message || 'Không thể xóa bản ghi do ràng buộc dữ liệu.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelName) return;
    setError('');

    try {
      // Cast fields back to correct types matching original records
      const castedData: Record<string, any> = {};
      Object.keys(formData).forEach((key) => {
        const originalVal = records[0]?.[key];
        if (typeof originalVal === 'number') {
          castedData[key] = Number(formData[key]);
        } else if (typeof originalVal === 'boolean') {
          castedData[key] = formData[key] === 'true' || formData[key] === true;
        } else {
          castedData[key] = formData[key];
        }
      });

      if (editingRecord) {
        await apiRequest(`/cms/database/models/${modelName}/${editingRecord.id}`, 'PATCH', castedData);
      } else {
        await apiRequest(`/cms/database/models/${modelName}`, 'POST', castedData);
      }
      fetchRecords();
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi lưu dữ liệu bản ghi.');
    }
  };

  const filteredRecords = records.filter((r) => {
    return columns.some((col) => {
      const val = r[col];
      return val !== null && String(val).toLowerCase().includes(searchTerm.toLowerCase());
    });
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Dữ liệu bảng: {modelName}</h2>
            <p className="text-slate-400 text-sm mt-1">
              Quản lý và thực hiện chỉnh sửa cơ sở dữ liệu trực tiếp
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2.5 px-5 rounded-xl text-sm flex items-center gap-2 transition-all duration-200 shadow-lg shadow-emerald-500/10"
        >
          <Plus size={16} />
          <span>Thêm bản ghi mới</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder={`Tìm kiếm trong các cột của bảng ${modelName}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-700 focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* Table Data */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-xs">Đang tải cấu trúc dữ liệu...</p>
        </div>
      ) : filteredRecords.length > 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 overflow-hidden">
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs text-slate-350 whitespace-nowrap">
              <thead className="bg-slate-950/60 text-slate-400 text-[10px] font-bold uppercase tracking-wider sticky top-0 z-10">
                <tr>
                  {columns.map((col) => (
                    <th key={col} className="py-3.5 px-4 bg-slate-950/80">{col}</th>
                  ))}
                  <th className="py-3.5 px-4 bg-slate-950/80 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-850/30 transition-colors">
                    {columns.map((col) => {
                      const val = record[col];
                      let displayVal = String(val ?? 'NULL');
                      if (typeof val === 'boolean') {
                        displayVal = val ? 'TRUE' : 'FALSE';
                      }
                      return (
                        <td key={col} className="py-3 px-4 max-w-xs truncate" title={displayVal}>
                          {displayVal}
                        </td>
                      );
                    })}
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(record)}
                          className="p-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors"
                          title="Sửa"
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteRecord(record.id)}
                          className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg transition-colors"
                          title="Xóa"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
          <Database size={32} className="text-slate-700" />
          <p className="text-xs">Bảng {modelName} hiện đang trống và chưa có bản ghi nào.</p>
        </div>
      )}

      {/* Dynamic Edit/Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-slideUp">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">
                {editingRecord ? `Chỉnh sửa: ${modelName}` : `Thêm bản ghi mới: ${modelName}`}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {error && (
              <div className="p-4 mx-6 mt-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl flex items-start gap-2.5">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[450px] overflow-y-auto">
              {Object.keys(formData).map((key) => {
                const sampleVal = records[0]?.[key];
                return (
                  <div key={key}>
                    <label className="block text-slate-450 text-[10px] font-semibold mb-1.5 uppercase tracking-wider">
                      {key}
                    </label>
                    
                    {typeof sampleVal === 'boolean' ? (
                      <select
                        value={formData[key] ? 'true' : 'false'}
                        onChange={(e) => setFormData({ ...formData, [key]: e.target.value === 'true' })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl py-2 px-3 text-xs text-white focus:outline-none transition-all"
                      >
                        <option value="true">TRUE</option>
                        <option value="false">FALSE</option>
                      </select>
                    ) : typeof sampleVal === 'number' ? (
                      <input
                        type="number"
                        required
                        value={formData[key]}
                        onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl py-2 px-3 text-xs text-white focus:outline-none transition-all"
                      />
                    ) : (
                      <input
                        type="text"
                        value={formData[key]}
                        onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                        placeholder={`Nhập ${key}...`}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl py-2 px-3 text-xs text-white focus:outline-none transition-all"
                      />
                    )}
                  </div>
                );
              })}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold rounded-xl text-xs transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-500/10"
                >
                  <Save size={14} />
                  Lưu bản ghi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default DatabaseManager;
