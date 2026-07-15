import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../utils/api';
import { 
  Upload, 
  Trash2, 
  Copy, 
  Image as ImageIcon,
  Check,
  Search,
  ExternalLink
} from 'lucide-react';
import type { IMediaProps } from './media.type';

interface MediaFile {
  filename: string;
  size: number;
  url: string;
  createdAt: string;
}

export const Media: React.FC<IMediaProps> = (_props) => {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedFilename, setCopiedFilename] = useState<string | null>(null);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/media');
      setFiles(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Failed to fetch media files:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const formData = new FormData();
    formData.append('file', fileList[0]);

    try {
      setUploading(true);
      
      // We need to fetch directly to append token and custom content type
      const baseUrl = import.meta.env.VITE_API_BASE_URL || (window.location.origin + '/api/v1');
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`${baseUrl}/media/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      await response.json();
      fetchFiles();
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Không thể tải ảnh lên! Vui lòng kiểm tra lại định dạng tệp.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (filename: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa vĩnh viễn hình ảnh này?')) return;
    try {
      await apiRequest(`/media/${filename}`, 'DELETE');
      setFiles(files.filter(f => f.filename !== filename));
    } catch (err) {
      console.error('Failed to delete file:', err);
      alert('Không thể xóa file!');
    }
  };

  const handleCopyUrl = (url: string, filename: string) => {
    // Generate absolute path
    const absoluteUrl = window.location.origin.includes('localhost')
      ? `http://localhost:3000${url}`
      : `${window.location.origin.replace('cms', 'backend')}${url}`;

    // fallback mapping URL dynamically
    const finalUrl = absoluteUrl.includes('render.com') 
      ? url 
      : absoluteUrl;

    navigator.clipboard.writeText(finalUrl);
    setCopiedFilename(filename);
    setTimeout(() => setCopiedFilename(null), 2000);
  };

  const filteredFiles = files.filter(f => 
    f.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-8 animate-fadeIn text-[#1b1c1b]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Thư viện Hình ảnh</h2>
          <p className="text-[#526069] text-sm mt-1">Quản lý và tải lên tài nguyên hình ảnh dùng cho Sản phẩm & Banner</p>
        </div>

        {/* Upload Button */}
        <div>
          <label className="flex items-center gap-2 px-5 py-3 bg-[#0e6877] hover:bg-[#0c5966] text-white text-xs font-bold uppercase tracking-wider rounded-2xl shadow-sm hover:shadow-md cursor-pointer transition-all active:scale-95 duration-200">
            <Upload size={16} />
            {uploading ? 'Đang tải lên...' : 'Tải ảnh mới'}
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleFileUpload} 
              disabled={uploading} 
            />
          </label>
        </div>
      </div>

      {/* Filter and Stats Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white border border-slate-200 rounded-3xl p-4.5 shadow-sm">
        {/* Search */}
        <div className="relative w-full sm:max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <Search size={16} />
          </span>
          <input 
            type="text" 
            placeholder="Tìm kiếm tên file ảnh..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0e6877] focus:bg-white transition-all text-slate-800"
          />
        </div>
        
        {/* Stats */}
        <div className="text-xs font-bold text-[#526069] flex items-center gap-4">
          <span>Tổng số: <strong className="text-[#0e6877]">{files.length} ảnh</strong></span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline">Thư mục lưu trữ: <strong className="text-slate-800">/public/uploads</strong></span>
        </div>
      </div>

      {/* Grid Images */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-12 h-12 border-4 border-[#0e6877] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#526069] text-sm font-medium">Đang tải thư viện ảnh...</p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl py-20 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-[#ecf6f7] text-[#0e6877] rounded-full flex items-center justify-center mx-auto">
            <ImageIcon size={28} />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold">Thư viện hình ảnh trống</h4>
            <p className="text-[#526069] text-xs">Hãy tải lên bức ảnh đầu tiên cho dự án của bạn!</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {filteredFiles.map((file) => {
            const absoluteUrl = file.url.includes('http')
              ? file.url
              : window.location.origin.includes('localhost')
                ? `http://localhost:3000${file.url}`
                : `${window.location.origin.replace('cms', 'backend')}${file.url}`;

            return (
              <div 
                key={file.filename}
                className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs hover:shadow-md hover:border-[#0e6877]/20 transition-all duration-300 group flex flex-col justify-between"
              >
                {/* Thumbnail Image Wrapper */}
                <div className="aspect-square bg-slate-50 relative overflow-hidden flex items-center justify-center border-b border-slate-100">
                  <img 
                    src={absoluteUrl} 
                    alt={file.filename} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    loading="lazy"
                  />
                  
                  {/* Actions overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button 
                      onClick={() => handleCopyUrl(file.url, file.filename)}
                      className="p-2 bg-white rounded-xl text-slate-800 hover:bg-[#ecf6f7] hover:text-[#0e6877] active:scale-95 transition-all shadow-sm"
                      title="Copy URL"
                    >
                      {copiedFilename === file.filename ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                    
                    <a 
                      href={absoluteUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 bg-white rounded-xl text-slate-800 hover:bg-[#ecf6f7] hover:text-[#0e6877] active:scale-95 transition-all shadow-sm"
                      title="Xem ảnh gốc"
                    >
                      <ExternalLink size={16} />
                    </a>

                    <button 
                      onClick={() => handleDeleteFile(file.filename)}
                      className="p-2 bg-rose-600 rounded-xl text-white hover:bg-rose-700 active:scale-95 transition-all shadow-sm"
                      title="Xóa ảnh"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* File Details Info */}
                <div className="p-3.5 space-y-1 bg-white">
                  <p className="text-xs font-bold truncate text-slate-800" title={file.filename}>
                    {file.filename}
                  </p>
                  <div className="flex justify-between text-[10px] text-[#526069] font-medium">
                    <span>{formatSize(file.size)}</span>
                    <span>{new Date(file.createdAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default Media;
