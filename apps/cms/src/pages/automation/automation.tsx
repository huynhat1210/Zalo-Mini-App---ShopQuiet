import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Edit, 
  Trash2, 
  Plus, 
  MoreVertical,
  TrendingUp,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  Copy,
  Zap
} from 'lucide-react';

interface Automation {
  id: number;
  name: string;
  description?: string;
  trigger: string;
  actions: any[];
  conditions: any;
  enabled: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

interface AutomationStats {
  totalTriggered: number;
  successful: number;
  failed: number;
  successRate: number;
}

const triggerLabels: Record<string, string> = {
  'NEW_USER': '👤 Thành viên mới',
  'BIRTHDAY': '🎂 Sinh nhật',
  'CART_ABANDONED': '🛒 Giỏ hàng bỏ quên',
  'INACTIVE_30_DAYS': '💤 Chưa mua 30 ngày',
  'MEMBERSHIP_UPGRADE': '⭐ Thăng hạng',
  'FIRST_PURCHASE': '🛍️ Mua lần đầu',
};

const triggerColors: Record<string, string> = {
  'NEW_USER': 'bg-blue-100 text-blue-700',
  'BIRTHDAY': 'bg-pink-100 text-pink-700',
  'CART_ABANDONED': 'bg-orange-100 text-orange-700',
  'INACTIVE_30_DAYS': 'bg-gray-100 text-gray-700',
  'MEMBERSHIP_UPGRADE': 'bg-yellow-100 text-yellow-700',
  'FIRST_PURCHASE': 'bg-green-100 text-green-700',
};

export default function Automation() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [stats, setStats] = useState<Record<number, AutomationStats>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null);

  // Load automations
  useEffect(() => {
    loadAutomations();
  }, []);

  const loadAutomations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/automation');
      const data = await response.json();
      setAutomations(data);

      // Load stats for each automation
      for (const automation of data) {
        const statsResponse = await fetch(`/api/automation/${automation.id}/stats`);
        const statsData = await statsResponse.json();
        setStats(prev => ({ ...prev, [automation.id]: statsData }));
      }
    } catch (error) {
      console.error('Failed to load automations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAutomation = async (id: number, enabled: boolean) => {
    try {
      await fetch(`/api/automation/${id}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      loadAutomations();
    } catch (error) {
      console.error('Failed to toggle automation:', error);
    }
  };

  const deleteAutomation = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa automation này?')) return;
    
    try {
      await fetch(`/api/automation/${id}`, { method: 'DELETE' });
      loadAutomations();
    } catch (error) {
      console.error('Failed to delete automation:', error);
    }
  };

  const duplicateAutomation = async (automation: Automation) => {
    try {
      await fetch('/api/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...automation,
          name: `${automation.name} (Copy)`,
          enabled: false,
        }),
      });
      loadAutomations();
    } catch (error) {
      console.error('Failed to duplicate automation:', error);
    }
  };

  const getTotalStats = () => {
    const allStats = Object.values(stats);
    return {
      totalTriggered: allStats.reduce((sum, s) => sum + s.totalTriggered, 0),
      successful: allStats.reduce((sum, s) => sum + s.successful, 0),
      failed: allStats.reduce((sum, s) => sum + s.failed, 0),
      successRate: allStats.length > 0 
        ? Math.round((allStats.reduce((sum, s) => sum + s.successful, 0) / 
                     allStats.reduce((sum, s) => sum + s.totalTriggered, 0)) * 100) 
        : 0,
    };
  };

  const totalStats = getTotalStats();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Zap className="w-6 h-6 text-[#0e6877]" />
            Quy trình Tự động
          </h1>
          <p className="text-slate-600 mt-1">Quản lý các quy trình marketing tự động</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-[#0e6877] text-white rounded-xl hover:bg-[#0b5663] transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Tạo Automation
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Triggered</p>
              <p className="text-xl font-bold text-slate-800">{totalStats.totalTriggered}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Successful</p>
              <p className="text-xl font-bold text-slate-800">{totalStats.successful}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Failed</p>
              <p className="text-xl font-bold text-slate-800">{totalStats.failed}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Success Rate</p>
              <p className="text-xl font-bold text-slate-800">{totalStats.successRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Automation List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-600">Đang tải...</div>
        ) : automations.length === 0 ? (
          <div className="p-8 text-center text-slate-600">
            <Zap className="w-12 h-12 mx-auto mb-4 text-slate-400" />
            <p>Chưa có automation nào</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-4 py-2 bg-[#0e6877] text-white rounded-xl hover:bg-[#0b5663] transition-colors"
            >
              Tạo Automation đầu tiên
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                  Tên
                </th>
                <th className="text-left px-6 py-3 text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                  Trigger
                </th>
                <th className="text-left px-6 py-3 text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                  Stats
                </th>
                <th className="text-left px-6 py-3 text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {automations.map((automation) => (
                <tr key={automation.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-bold text-slate-800">{automation.name}</p>
                      {automation.description && (
                        <p className="text-sm text-slate-600 mt-1">{automation.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${triggerColors[automation.trigger] || 'bg-slate-100 text-slate-700'}`}>
                      {triggerLabels[automation.trigger] || automation.trigger}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {stats[automation.id] ? (
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Zap className="w-4 h-4 text-blue-500" />
                          <span className="text-slate-700">{stats[automation.id].totalTriggered}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-slate-700">{stats[automation.id].successful}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4 text-purple-500" />
                          <span className="text-slate-700">{stats[automation.id].successRate}%</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleAutomation(automation.id, !automation.enabled)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                        automation.enabled
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {automation.enabled ? (
                        <span className="flex items-center gap-1">
                          <Play className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Pause className="w-3 h-3" />
                          Paused
                        </span>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedAutomation(automation)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4 text-slate-600" />
                      </button>
                      <button
                        onClick={() => duplicateAutomation(automation)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4 text-slate-600" />
                      </button>
                      <button
                        onClick={() => deleteAutomation(automation.id)}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || selectedAutomation) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-slate-800 mb-4">
              {selectedAutomation ? 'Chỉnh sửa Automation' : 'Tạo Automation Mới'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Tên Automation</label>
                <input
                  type="text"
                  defaultValue={selectedAutomation?.name}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0e6877]"
                  placeholder="VD: Chào mừng thành viên mới"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Mô tả</label>
                <textarea
                  defaultValue={selectedAutomation?.description}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0e6877]"
                  rows={2}
                  placeholder="Mô tả chức năng của automation..."
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Trigger</label>
                <select 
                  defaultValue={selectedAutomation?.trigger}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0e6877]"
                >
                  <option value="">Chọn trigger...</option>
                  {Object.entries(triggerLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Actions Section */}
              <div className="border-t border-slate-200 pt-4">
                <label className="block text-sm font-bold text-slate-700 mb-2">Actions</label>
                <div className="space-y-3">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-700">Action 1</span>
                      <select className="px-2 py-1 border border-slate-200 rounded-lg text-sm">
                        <option value="NOTIFICATION">Gửi thông báo</option>
                        <option value="VOUCHER">Tặng voucher</option>
                        <option value="POINTS">Tặng Xu</option>
                      </select>
                    </div>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0e6877] text-sm"
                      placeholder="Tiêu đề thông báo..."
                    />
                    <textarea
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0e6877] text-sm mt-2"
                      rows={2}
                      placeholder="Nội dung thông báo..."
                    />
                  </div>
                  <button className="w-full px-4 py-2 border-2 border-dashed border-slate-300 rounded-xl text-slate-600 hover:border-[#0e6877] hover:text-[#0e6877] transition-colors flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" />
                    Thêm Action
                  </button>
                </div>
              </div>

              {/* Conditions Section */}
              <div className="border-t border-slate-200 pt-4">
                <label className="block text-sm font-bold text-slate-700 mb-2">Conditions (Tùy chọn)</label>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2">
                    <select className="px-2 py-1 border border-slate-200 rounded-lg text-sm">
                      <option value="membershipTier">Hạng thành viên</option>
                      <option value="totalSpent">Tổng chi tiêu</option>
                      <option value="gamificationPoints">Điểm tích lũy</option>
                    </select>
                    <select className="px-2 py-1 border border-slate-200 rounded-lg text-sm">
                      <option value="eq">Bằng</option>
                      <option value="gt">Lớn hơn</option>
                      <option value="lt">Nhỏ hơn</option>
                      <option value="in">Trong danh sách</option>
                    </select>
                    <input
                      type="text"
                      className="flex-1 px-2 py-1 border border-slate-200 rounded-lg text-sm"
                      placeholder="Giá trị"
                    />
                  </div>
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Priority (Độ ưu tiên)</label>
                <input
                  type="number"
                  defaultValue={selectedAutomation?.priority || 0}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0e6877]"
                  placeholder="0 = thấp nhất, 100 = cao nhất"
                />
                <p className="text-xs text-slate-500 mt-1">Automation có priority cao hơn sẽ chạy trước</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedAutomation(null);
                }}
                className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedAutomation(null);
                  // TODO: Save automation
                }}
                className="px-4 py-2 bg-[#0e6877] text-white rounded-xl hover:bg-[#0b5663] transition-colors"
              >
                {selectedAutomation ? 'Lưu thay đổi' : 'Tạo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}