import React, { useState, useRef } from 'react';
import { X, Link2, FolderPlus, Film, Plus, Folder, Loader2 } from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';

export const AddVideoModal: React.FC = () => {
  const { 
    isAddVideoModalOpen, 
    setAddVideoModalOpen, 
    addBatchTasks, 
    uploadVideoFiles, 
    addLocalPath, 
    addLog 
  } = useStudioStore();

  const [linksText, setLinksText] = useState('');
  const [activeTab, setActiveTab] = useState<'link' | 'local'>('local');
  const [localInputPath, setLocalInputPath] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  if (!isAddVideoModalOpen) return null;

  const handleAddLinks = async () => {
    const lines = linksText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      addLog('Vui lòng nhập ít nhất 1 đường link hoặc tên video.', 'warn');
      return;
    }

    await addBatchTasks(lines);
    setLinksText('');
    setAddVideoModalOpen(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processSelectedFiles(Array.from(files));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFolderChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const videoFiles = Array.from(files).filter((f) => 
      /\.(mp4|mkv|mov|ts|avi|webm|flv)$/i.test(f.name)
    );
    if (videoFiles.length === 0) {
      addLog('Không tìm thấy file video nào trong thư mục đã chọn.', 'warn');
      return;
    }
    await processSelectedFiles(videoFiles);
    if (folderInputRef.current) folderInputRef.current.value = '';
  };

  const processSelectedFiles = async (files: File[]) => {
    setIsUploading(true);
    setUploadStatus(`Đang nhập ${files.length} file video vào hàng đợi...`);
    try {
      await uploadVideoFiles(files);
      setAddVideoModalOpen(false);
    } catch (err: any) {
      addLog(`Lỗi khi nhập file: ${err?.message || err}`, 'error');
    } finally {
      setIsUploading(false);
      setUploadStatus('');
    }
  };

  const handleAddDirectPath = async () => {
    if (!localInputPath.trim()) {
      addLog('Vui lòng nhập đường dẫn file hoặc thư mục hợp lệ.', 'warn');
      return;
    }
    setIsUploading(true);
    setUploadStatus('Đang quét và thêm video từ đường dẫn...');
    try {
      await addLocalPath(localInputPath.trim());
      setLocalInputPath('');
      setAddVideoModalOpen(false);
    } catch (err: any) {
      addLog(`Lỗi quét đường dẫn: ${err?.message || err}`, 'error');
    } finally {
      setIsUploading(false);
      setUploadStatus('');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    const videoFiles = Array.from(files).filter((f) => 
      /\.(mp4|mkv|mov|ts|avi|webm|flv)$/i.test(f.name)
    );
    if (videoFiles.length === 0) {
      addLog('Vui lòng kéo thả các file định dạng video (.mp4, .mkv, .mov, .ts, .avi).', 'warn');
      return;
    }
    await processSelectedFiles(videoFiles);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-[#151c27] border border-[#2d3e58] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Hidden HTML5 File Inputs for Real File Picking */}
        <input
          type="file"
          ref={fileInputRef}
          accept="video/*,.mp4,.mkv,.mov,.ts,.avi,.flv,.webm"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          type="file"
          ref={folderInputRef}
          {...({ webkitdirectory: '', directory: '' } as any)}
          multiple
          onChange={handleFolderChange}
          className="hidden"
        />

        {/* Header */}
        <div className="bg-[#101620] px-4 py-3 border-b border-[#233145] flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Thêm Video Vào Hàng Đợi Tự Động Hóa</span>
          </div>
          <button
            onClick={() => setAddVideoModalOpen(false)}
            disabled={isUploading}
            className="text-slate-400 hover:text-white p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#233145] bg-[#0c1118]">
          <button
            onClick={() => setActiveTab('local')}
            className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'local'
                ? 'border-emerald-500 text-emerald-400 bg-[#151c27]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderPlus className="w-4 h-4" />
            Chọn File Video Có Sẵn
          </button>
          <button
            onClick={() => setActiveTab('link')}
            className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'link'
                ? 'border-emerald-500 text-emerald-400 bg-[#151c27]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Link2 className="w-4 h-4" />
            Nhập Link (Douyin / TikTok / YouTube)
          </button>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col gap-3">
          {activeTab === 'local' ? (
            <>
              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center py-7 px-4 border-2 border-dashed rounded-xl transition-all gap-3 ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-950/20'
                    : 'border-[#2d3f58] hover:border-emerald-500/60 bg-[#0d131c]'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-[#152132] flex items-center justify-center border border-[#2b3e57]">
                  {isUploading ? (
                    <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                  ) : (
                    <Film className="w-6 h-6 text-emerald-400" />
                  )}
                </div>
                <div className="text-center">
                  <div className="text-xs font-semibold text-slate-200">
                    {isUploading ? uploadStatus : 'Kéo thả file video vào đây hoặc chọn từ máy tính'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Hỗ trợ định dạng: <span className="text-emerald-400 font-mono">.MP4, .MKV, .MOV, .TS, .AVI</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 mt-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-lg text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Film className="w-3.5 h-3.5" />
                    Chọn File Video (.mp4)
                  </button>
                  <button
                    type="button"
                    onClick={() => folderInputRef.current?.click()}
                    disabled={isUploading}
                    className="px-3.5 py-2 bg-[#1e293b] hover:bg-[#334155] border border-[#3b4d66] text-slate-200 rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Folder className="w-3.5 h-3.5 text-amber-400" />
                    Chọn Cả Thư Mục
                  </button>
                </div>
              </div>

              {/* Direct Path Input */}
              <div className="bg-[#0e141e] border border-[#233145] p-3 rounded-xl flex flex-col gap-2">
                <label className="text-slate-300 text-[11px] font-semibold flex items-center gap-1.5">
                  <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
                  Hoặc nhập trực tiếp đường dẫn file / thư mục trên máy tính:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={localInputPath}
                    onChange={(e) => setLocalInputPath(e.target.value)}
                    placeholder="VD: D:\Videos\tap_17.mp4 hoặc D:\Videos\HoatHinh\"
                    className="flex-1 bg-[#151d2a] border border-[#2e405a] rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddDirectPath();
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddDirectPath}
                    disabled={isUploading || !localInputPath.trim()}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-md transition-colors flex items-center gap-1 whitespace-nowrap cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Thêm
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 italic">
                  💡 Nhập đường dẫn thư mục sẽ tự động quét và thêm tất cả các tập phim có trong thư mục đó vào hàng đợi.
                </p>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-slate-400 leading-relaxed">
                Dán danh sách liên kết video Douyin / Kuaishou / TikTok / Bilibili / YouTube (mỗi dòng một link). Tool sẽ tự động dùng <code className="text-amber-400 font-mono">yt-dlp</code> để tải không logo.
              </p>
              <textarea
                rows={7}
                value={linksText}
                onChange={(e) => setLinksText(e.target.value)}
                placeholder={`https://v.douyin.com/iRxxxx/\nhttps://v.douyin.com/iRyyyy/\nVideo_22`}
                className="w-full bg-[#0a0f16] border border-[#233145] rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500 resize-none"
              />
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#101620] px-4 py-3 border-t border-[#233145] flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            {isUploading && (
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <Loader2 className="w-3 h-3 animate-spin" />
                {uploadStatus}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAddVideoModalOpen(false)}
              disabled={isUploading}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:bg-slate-800 transition-colors"
            >
              Đóng
            </button>
            {activeTab === 'link' && (
              <button
                onClick={handleAddLinks}
                disabled={isUploading || !linksText.trim()}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm Vào Hàng Đợi
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
