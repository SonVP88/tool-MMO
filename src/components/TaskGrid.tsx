import React from 'react';
import { 
  Play, 
  Folder, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Loader2,
  FileVideo
} from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';
import type { FilterTab, TaskItem } from '../types';

export const TaskGrid: React.FC = () => {
  const {
    tasks,
    filterTab,
    setFilterTab,
    toggleTaskSelect,
    selectAllTasks,
    deleteTask,
    currentVideoId,
    setCurrentVideoId,
    addLog,
  } = useStudioStore();

  // Counts for tabs
  const counts = {
    ALL: tasks.length,
    WAITING: tasks.filter((t) => t.status === 'WAITING').length,
    PROCESSING: tasks.filter((t) => t.status === 'PROCESSING' || t.status === 'SUBTITLE').length,
    DONE: tasks.filter((t) => t.status === 'DONE').length,
    ERROR: tasks.filter((t) => t.status === 'ERROR').length,
    CANCELED: tasks.filter((t) => t.status === 'CANCELED').length,
  };

  const filteredTasks = tasks.filter((task) => {
    if (filterTab === 'ALL') return true;
    if (filterTab === 'WAITING') return task.status === 'WAITING';
    if (filterTab === 'PROCESSING') return task.status === 'PROCESSING' || task.status === 'SUBTITLE';
    if (filterTab === 'DONE') return task.status === 'DONE';
    if (filterTab === 'ERROR') return task.status === 'ERROR';
    if (filterTab === 'CANCELED') return task.status === 'CANCELED';
    return true;
  });

  const allSelected = filteredTasks.length > 0 && filteredTasks.every((t) => t.selected);

  const getStatusBadge = (status: TaskItem['status']) => {
    switch (status) {
      case 'DONE':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            DONE
          </span>
        );
      case 'SUBTITLE':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-sky-950/80 text-sky-400 border border-sky-500/40 inline-flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            SUBTITLE
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-950/80 text-amber-400 border border-amber-500/40 inline-flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            RUNNING
          </span>
        );
      case 'WAITING':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700 inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            WAITING
          </span>
        );
      case 'ERROR':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-950/80 text-rose-400 border border-rose-500/40 inline-flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            ERROR
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-400">
            {status}
          </span>
        );
    }
  };

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'ALL', label: 'Tất cả', count: counts.ALL },
    { key: 'WAITING', label: 'Đang chờ', count: counts.WAITING },
    { key: 'PROCESSING', label: 'Đang xử lý', count: counts.PROCESSING },
    { key: 'DONE', label: 'Thành công', count: counts.DONE },
    { key: 'ERROR', label: 'Thất bại', count: counts.ERROR },
    { key: 'CANCELED', label: 'Đã hủy', count: counts.CANCELED },
  ];

  return (
    <div className="bg-[#151c27] border border-[#253246] rounded-xl flex flex-col flex-1 overflow-hidden shadow-lg select-none">
      {/* Filter Tabs Header */}
      <div className="flex items-center bg-[#101620] px-2 pt-2 border-b border-[#253246] gap-1 overflow-x-auto">
        <span className="text-[11px] font-bold text-slate-400 px-2 uppercase tracking-wider">
          Lọc Trạng Thái:
        </span>
        {tabs.map((tab) => {
          const isActive = filterTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setFilterTab(tab.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
                isActive
                  ? 'bg-[#151c27] text-emerald-400 border-emerald-400'
                  : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/40'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-y-auto overflow-x-auto min-h-[180px]">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#121924] text-slate-400 font-bold border-b border-[#253246] sticky top-0 z-10 text-[11px]">
              <th className="py-2 px-3 w-8 text-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => selectAllTasks(e.target.checked)}
                  className="rounded bg-[#0f141c] border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
                />
              </th>
              <th className="py-2 px-2 w-8 text-center">#</th>
              <th className="py-2 px-3 min-w-[90px]">Tên Video</th>
              <th className="py-2 px-3 min-w-[100px]">Giai Đoạn</th>
              <th className="py-2 px-3 min-w-[90px]">Tiến Độ</th>
              <th className="py-2 px-3 min-w-[100px]">Trạng Thái</th>
              <th className="py-2 px-3 min-w-[120px]">Ghi Chú</th>
              <th className="py-2 px-3 min-w-[100px]">Đầu Ra</th>
              <th className="py-2 px-3 w-28 text-center">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e293b]">
            {filteredTasks.map((task, index) => {
              const isCurrent = currentVideoId === task.id;
              return (
                <tr
                  key={task.id}
                  onClick={() => setCurrentVideoId(task.id)}
                  className={`hover:bg-[#1a2436] transition-colors cursor-pointer group ${
                    isCurrent ? 'bg-[#1b263b]/70 border-l-2 border-emerald-400' : ''
                  }`}
                >
                  <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={task.selected}
                      onChange={() => toggleTaskSelect(task.id)}
                      className="rounded bg-[#0f141c] border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
                    />
                  </td>
                  <td className="py-2 px-2 text-center text-slate-400 font-mono text-[11px]">
                    {index + 1}
                  </td>
                  <td className="py-2 px-3 font-semibold text-slate-100 flex items-center gap-1.5">
                    <FileVideo className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="truncate">{task.name}</span>
                  </td>
                  <td className="py-2 px-3 text-slate-300 font-medium">
                    {task.stage}
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-[#0f141c] rounded-full overflow-hidden max-w-[60px]">
                        <div
                          className={`h-full rounded-full ${
                            task.progress === 100
                              ? 'bg-emerald-500'
                              : task.progress > 0
                              ? 'bg-sky-500'
                              : 'bg-slate-700'
                          }`}
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] text-slate-300 w-8">
                        {task.progress}%
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-3">{getStatusBadge(task.status)}</td>
                  <td className="py-2 px-3 text-slate-400 truncate max-w-[140px]" title={task.note}>
                    {task.note}
                  </td>
                  <td className="py-2 px-3 text-slate-400 font-mono text-[10px] truncate max-w-[90px]" title={task.outputPath}>
                    {task.outputPath}
                  </td>
                  <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      {/* View / Select preview */}
                      <button
                        title="Xem trước video này"
                        onClick={() => setCurrentVideoId(task.id)}
                        className={`p-1 rounded hover:bg-emerald-600/30 text-emerald-400 ${
                          isCurrent ? 'bg-emerald-600/30 ring-1 ring-emerald-400' : ''
                        }`}
                      >
                        <Play className="w-3.5 h-3.5 fill-emerald-400" />
                      </button>

                      {/* Open output */}
                      <button
                        title="Mở thư mục chứa file"
                        onClick={() => addLog(`Mở file: ${task.outputPath}`, 'info')}
                        className="p-1 rounded hover:bg-sky-600/30 text-sky-400"
                      >
                        <Folder className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        title="Xóa video khỏi danh sách"
                        onClick={() => deleteTask(task.id)}
                        className="p-1 rounded hover:bg-rose-600/30 text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredTasks.length === 0 && (
          <div className="py-8 text-center text-slate-500 text-xs">
            Không có video nào trong bộ lọc này.
          </div>
        )}
      </div>
    </div>
  );
};
