import { useState, useEffect } from 'react';
import { crmApiRequest } from '../../utils/api';
import { useToast } from '../../contexts';
import { 
  Play, 
  Pause, 
  Edit, 
  Trash2, 
  Plus, 
  TrendingUp,
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
  'NEW_USER': 'Thành viên mới',
  'BIRTHDAY': 'Sinh nhật',
  'CART_ABANDONED': 'Giỏ hàng bỏ quên',
  'INACTIVE_30_DAYS': 'Chưa mua 30 ngày',
  'MEMBERSHIP_UPGRADE': 'Thăng hạng',
  'FIRST_PURCHASE': 'Mua lần đầu',
};

const triggerColors: Record<string, string> = {
  'NEW_USER': 'bg-blue-100 text-blue-700',
  'BIRTHDAY': 'bg-pink-100 text-pink-700',
  'CART_ABANDONED': 'bg-orange-100 text-orange-700',
  'INACTIVE_30_DAYS': 'bg-gray-100 text-gray-700',
  'MEMBERSHIP_UPGRADE': 'bg-yellow-100 text-yellow-700',
  'FIRST_PURCHASE': 'bg-green-100 text-green-700',
};

export function Automation() {
  const { success: toastSuccess, error: toastError, warning: toastWarning, confirm } = useToast();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [stats, setStats] = useState<Record<number, AutomationStats>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [trigger, setTrigger] = useState('');
  const [priority, setPriority] = useState(0);
  const [actions, setActions] = useState<any[]>([{ type: 'NOTIFICATION', config: { title: '', content: '' } }]);
  const [conditions, setConditions] = useState<any>({});

  // When selectedAutomation changes or modal opens, pre-fill form state
  useEffect(() => {
    if (selectedAutomation) {
      setName(selectedAutomation.name);
      setDescription(selectedAutomation.description || '');
      setTrigger(selectedAutomation.trigger);
      setPriority(selectedAutomation.priority);
      setActions(selectedAutomation.actions || [{ type: 'NOTIFICATION', config: { title: '', content: '' } }]);
      setConditions(selectedAutomation.conditions || {});
    } else {
      setName('');
      setDescription('');
      setTrigger('');
      setPriority(0);
      setActions([{ type: 'NOTIFICATION', config: { title: '', content: '' } }]);
      setConditions({});
    }
  }, [selectedAutomation, showCreateModal]);

  // Load automations
  useEffect(() => {
    loadAutomations();
  }, []);

  const loadAutomations = async () => {
    try {
      setIsLoading(true);
      const data = await crmApiRequest<Automation[]>('/automation');
      setAutomations(data || []);

      // Load stats for each automation
      for (const automation of data || []) {
        try {
          const statsData = await crmApiRequest<AutomationStats>(`/automation/${automation.id}/stats`);
          setStats(prev => ({ ...prev, [automation.id]: statsData }));
        } catch (e) {
          console.error(`Failed to load stats for automation ${automation.id}:`, e);
        }
      }
    } catch (error) {
      console.error('Failed to load automations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAutomation = async (id: number, enabled: boolean) => {
    try {
      await crmApiRequest(`/automation/${id}/toggle`, 'PUT', { enabled });
      loadAutomations();
    } catch (error) {
      console.error('Failed to toggle automation:', error);
    }
  };

  const deleteAutomation = async (id: number) => {
    if (!(await confirm('Xóa quy trình?', 'Thao tác này không thể hoàn tác.'))) return;
    
    try {
      await crmApiRequest(`/automation/${id}`, 'DELETE');
      loadAutomations();
    } catch (error) {
      console.error('Failed to delete automation:', error);
    }
  };

  const duplicateAutomation = async (automation: Automation) => {
    try {
      await crmApiRequest('/automation', 'POST', {
        ...automation,
        name: `${automation.name} (Bản sao)`,
        enabled: false,
      });
      loadAutomations();
    } catch (error) {
      console.error('Failed to duplicate automation:', error);
    }
  };

  const handleSeedTemplates = async () => {
    try {
      setIsLoading(true);
      await crmApiRequest('/automation/seed-templates', 'POST');
      await loadAutomations();
      toastSuccess('Đã tải kịch bản mẫu');
    } catch (error) {
      console.error('Failed to seed templates:', error);
      toastError('Không thể tải kịch bản mẫu', 'Vui lòng kiểm tra lại dịch vụ Campaign.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toastWarning('Thiếu tên quy trình', 'Vui lòng nhập tên trước khi lưu.');
      return;
    }
    if (!trigger) {
      toastWarning('Thiếu trigger', 'Vui lòng chọn trigger trước khi lưu.');
      return;
    }

    try {
      const payload = {
        name,
        description,
        trigger,
        actions,
        conditions,
        priority: Number(priority) || 0,
      };

      if (selectedAutomation) {
        await crmApiRequest(`/automation/${selectedAutomation.id}`, 'PUT', payload);
      } else {
        await crmApiRequest('/automation', 'POST', payload);
      }

      setShowCreateModal(false);
      setSelectedAutomation(null);
      loadAutomations();
    } catch (error) {
      console.error('Failed to save automation:', error);
      toastError('Không thể lưu quy trình', 'Vui lòng kiểm tra cấu hình.');
    }
  };

  const getTotalStats = () => {
    const allStats = Object.values(stats);
    return {
      totalTriggered: allStats.reduce((sum, s) => sum + s.totalTriggered, 0),
      successful: allStats.reduce((sum, s) => sum + s.successful, 0),
      failed: allStats.reduce((sum, s) => sum + s.failed, 0),
      successRate: allStats.reduce((sum, s) => sum + s.totalTriggered, 0) > 0
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
        <div className="flex items-center gap-3">
          <button
            onClick={handleSeedTemplates}
            className="px-4 py-2 border border-[#0e6877] text-[#0e6877] rounded-xl hover:bg-teal-50 transition-colors flex items-center gap-2 cursor-pointer bg-white font-bold text-xs"
          >
            <Zap className="w-4 h-4" /> Tải các kịch bản mẫu
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-[#0e6877] text-white rounded-xl hover:bg-[#0b5663] transition-colors flex items-center gap-2 cursor-pointer border-none font-bold text-xs"
          >
            <Plus className="w-4 h-4" />
            Tạo quy trình tự động
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Tổng lượt kích hoạt</p>
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
              <p className="text-sm text-slate-600">Thành công</p>
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
              <p className="text-sm text-slate-600">Thất bại</p>
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
              <p className="text-sm text-slate-600">Tỷ lệ thành công</p>
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
            <p className="font-semibold">Chưa có kịch bản tự động hóa nào</p>
            <p className="text-sm text-slate-400 mt-1">Hãy nhấp vào nút dưới đây hoặc "Tải các kịch bản mẫu" để bắt đầu</p>
            <div className="flex justify-center gap-3 mt-4">
              <button
                onClick={handleSeedTemplates}
                className="px-4 py-2 border border-[#0e6877] text-[#0e6877] rounded-xl hover:bg-teal-50 transition-colors cursor-pointer bg-white font-bold text-xs"
              >
                <Zap className="w-4 h-4" /> Tải các kịch bản mẫu
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-[#0e6877] text-white rounded-xl hover:bg-[#0b5663] transition-colors cursor-pointer border-none font-bold text-xs"
              >
                Tạo quy trình đầu tiên
              </button>
            </div>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                  Tên
                </th>
                <th className="text-left px-6 py-3 text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                  Sự kiện kích hoạt
                </th>
                <th className="text-left px-6 py-3 text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                  Thống kê
                </th>
                <th className="text-left px-6 py-3 text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="text-left px-6 py-3 text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                  Thao tác
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
                        <p className="text-xs text-slate-500 mt-1">{automation.description}</p>
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
                      <div className="flex items-center gap-4 text-xs">
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
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer border-none ${
                        automation.enabled
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {automation.enabled ? (
                        <span className="flex items-center gap-1">
                          <Play className="w-3 h-3" />
                          Đang bật
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Pause className="w-3 h-3" />
                          Đang tắt
                        </span>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedAutomation(automation)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                        title="Chỉnh sửa"
                      >
                        <Edit className="w-4 h-4 text-slate-600" />
                      </button>
                      <button
                        onClick={() => duplicateAutomation(automation)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4 text-slate-600" />
                      </button>
                      <button
                        onClick={() => deleteAutomation(automation.id)}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                        title="Xóa"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-6 py-5">
              <div>
                <div className="mb-1 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#0e6877]"><Zap className="h-4 w-4" /> Bộ điều phối tự động</div>
                <h2 className="text-lg font-extrabold text-slate-900">{selectedAutomation ? 'Chỉnh sửa quy trình' : 'Tạo quy trình mới'}</h2>
                <p className="mt-1 text-xs text-slate-500">Thiết lập điều kiện và hành động chăm sóc khách hàng.</p>
              </div>
              <button onClick={() => { setShowCreateModal(false); setSelectedAutomation(null); }} className="rounded-xl border-none bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800">Đóng</button>
            </div>
            <div className="space-y-4 overflow-y-auto px-6 py-5">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Tên quy trình</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0e6877] text-sm bg-white"
                  placeholder="VD: Chào mừng thành viên mới"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Mô tả</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0e6877] text-sm bg-white"
                  rows={2}
                  placeholder="Mô tả chức năng của quy trình..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Sự kiện kích hoạt</label>
                <select 
                  value={trigger}
                  onChange={(e) => setTrigger(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0e6877] text-sm bg-white"
                >
                  <option value="">Chọn sự kiện...</option>
                  {Object.entries(triggerLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Khu vực thao tác */}
              <div className="border-t border-slate-200 pt-4">
                <label className="block text-xs font-bold text-slate-600 mb-2">Thao tác</label>
                <div className="space-y-3">
                  {actions.map((action, index) => (
                    <div key={index} className="p-4 bg-slate-50 rounded-xl border border-slate-200 relative">
                      {actions.length > 1 && (
                        <button
                          onClick={() => setActions(actions.filter((_, i) => i !== index))}
                          className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-200/50 transition-colors border-none bg-transparent cursor-pointer text-xs font-bold"
                        >
                          Xóa
                        </button>
                      )}
                      <div className="flex items-center justify-between mb-2 pr-12">
                        <span className="font-bold text-slate-700 text-xs">Hành động {index + 1}</span>
                        <select
                          value={action.type}
                          onChange={(e) => {
                            const newActions = [...actions];
                            newActions[index].type = e.target.value;
                            newActions[index].config = {};
                            setActions(newActions);
                          }}
                          className="px-2 py-1 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none"
                        >
                          <option value="NOTIFICATION">Gửi thông báo</option>
                          <option value="VOUCHER">Tặng voucher</option>
                          <option value="POINTS">Tặng Xu</option>
                        </select>
                      </div>

                      {action.type === 'NOTIFICATION' && (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={action.config?.title || ''}
                            onChange={(e) => {
                              const newActions = [...actions];
                              newActions[index].config = { ...newActions[index].config, title: e.target.value };
                              setActions(newActions);
                            }}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0e6877] text-sm bg-white"
                            placeholder="Tiêu đề thông báo..."
                          />
                          <textarea
                            value={action.config?.content || ''}
                            onChange={(e) => {
                              const newActions = [...actions];
                              newActions[index].config = { ...newActions[index].config, content: e.target.value };
                              setActions(newActions);
                            }}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0e6877] text-sm mt-2 bg-white"
                            rows={2}
                            placeholder="Nội dung thông báo..."
                          />
                        </div>
                      )}

                      {action.type === 'VOUCHER' && (
                        <div>
                          <input
                            type="text"
                            value={action.config?.voucherCode || ''}
                            onChange={(e) => {
                              const newActions = [...actions];
                              newActions[index].config = { ...newActions[index].config, voucherCode: e.target.value };
                              setActions(newActions);
                            }}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0e6877] text-sm bg-white"
                            placeholder="Nhập mã voucher (ví dụ: WELCOME50K)..."
                          />
                        </div>
                      )}

                      {action.type === 'POINTS' && (
                        <div className="space-y-2">
                          <input
                            type="number"
                            value={action.config?.points || 0}
                            onChange={(e) => {
                              const newActions = [...actions];
                              newActions[index].config = { ...newActions[index].config, points: parseInt(e.target.value) || 0 };
                              setActions(newActions);
                            }}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0e6877] text-sm bg-white"
                            placeholder="Số Xu tặng..."
                          />
                          <input
                            type="text"
                            value={action.config?.reason || ''}
                            onChange={(e) => {
                              const newActions = [...actions];
                              newActions[index].config = { ...newActions[index].config, reason: e.target.value };
                              setActions(newActions);
                            }}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0e6877] text-sm bg-white"
                            placeholder="Lý do tặng..."
                          />
                        </div>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => setActions([...actions, { type: 'NOTIFICATION', config: { title: '', content: '' } }])}
                    className="w-full px-4 py-2 border-2 border-dashed border-slate-300 rounded-xl text-slate-600 hover:border-[#0e6877] hover:text-[#0e6877] transition-colors flex items-center justify-center gap-2 cursor-pointer bg-white text-xs font-bold"
                  >
                    <Plus className="w-4 h-4" />
                    Thêm hành động
                  </button>
                </div>
              </div>

              {/* Conditions Section */}
              <div className="border-t border-slate-200 pt-4">
                <label className="block text-xs font-bold text-slate-600 mb-2">Điều kiện (tùy chọn)</label>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2">
                    <select
                      value={Object.keys(conditions)[0] || 'membershipTier'}
                      onChange={(e) => {
                        const field = e.target.value;
                        const operator = conditions[Object.keys(conditions)[0]]?.operator || 'eq';
                        const val = conditions[Object.keys(conditions)[0]]?.value || '';
                        setConditions({ [field]: { operator, value: val } });
                      }}
                      className="px-2 py-1 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none"
                    >
                      <option value="membershipTier">Hạng thành viên</option>
                      <option value="totalSpent">Tổng chi tiêu</option>
                    </select>
                    <select
                      value={conditions[Object.keys(conditions)[0]]?.operator || 'eq'}
                      onChange={(e) => {
                        const field = Object.keys(conditions)[0] || 'membershipTier';
                        const operator = e.target.value;
                        const val = conditions[field]?.value || '';
                        setConditions({ [field]: { operator, value: val } });
                      }}
                      className="px-2 py-1 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none"
                    >
                      <option value="eq">Bằng</option>
                      <option value="in">Trong danh sách (ngăn cách bởi dấu phẩy)</option>
                      <option value="gt">Lớn hơn</option>
                      <option value="lt">Nhỏ hơn</option>
                    </select>
                    <input
                      type="text"
                      value={
                        Array.isArray(conditions[Object.keys(conditions)[0]]?.value)
                          ? conditions[Object.keys(conditions)[0]]?.value.join(', ')
                          : conditions[Object.keys(conditions)[0]]?.value || ''
                      }
                      onChange={(e) => {
                        const field = Object.keys(conditions)[0] || 'membershipTier';
                        const operator = conditions[field]?.operator || 'eq';
                        let val: any = e.target.value;
                        if (operator === 'in') {
                          val = val.split(',').map((s: string) => s.trim()).filter(Boolean);
                        } else if (field === 'totalSpent') {
                          val = parseFloat(val) || 0;
                        }
                        setConditions({ [field]: { operator, value: val } });
                      }}
                      className="flex-1 px-2 py-1 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none"
                      placeholder="Giá trị (VD: Vàng hoặc 1000000)"
                    />
                  </div>
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Mức ưu tiên</label>
                <input
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0e6877] text-sm bg-white"
                  placeholder="0 = thấp nhất, 100 = cao nhất"
                />
                <p className="text-[10px] text-slate-400 mt-1">Quy trình có mức ưu tiên cao hơn sẽ chạy trước</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedAutomation(null);
                }}
                className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer bg-white text-xs font-bold"
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-[#0e6877] text-white rounded-xl hover:bg-[#0b5663] transition-colors cursor-pointer border-none text-xs font-bold"
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
