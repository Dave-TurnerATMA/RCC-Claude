import { useState, useEffect } from 'react';
import Modal from './Modal';
import { api } from '../api/client';
import { useApp } from '../contexts/AppContext';

interface Props {
  task: any;
  onClose: () => void;
}

export default function TaskDetailsModal({ task, onClose }: Props) {
  const { team } = useApp();
  const [requiredTask, setRequiredTask] = useState<any>(null);
  const [summary, setSummary] = useState<string>('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [tab, setTab] = useState<'overview' | 'history' | 'ai'>('overview');

  useEffect(() => {
    if (task.required_task_id && team) {
      api.getRequiredTask(team.id, task.required_task_id).then(setRequiredTask);
    }
  }, [task, team]);

  const loadSummary = async () => {
    if (!task.required_task_id || !team || summaryLoading) return;
    setSummaryLoading(true);
    try {
      const result = await api.getTaskSummary(team.id, task.required_task_id);
      setSummary(result.summary);
      setTab('ai');
    } catch {
      setSummary('Unable to generate summary at this time.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const history = requiredTask?.history || [];
  const avgEffort = history.length > 0
    ? (history.reduce((s: number, h: any) => s + (h.actual_hours || 0), 0) / history.filter((h: any) => h.actual_hours).length).toFixed(1)
    : null;
  const avgCrew = history.length > 0
    ? (history.reduce((s: number, h: any) => s + (h.crew_count || 0), 0) / history.length).toFixed(1)
    : null;

  const lastPerformed = history[0];
  const daysSinceLast = lastPerformed?.completed_at
    ? Math.floor((Date.now() - new Date(lastPerformed.completed_at).getTime()) / 86400000)
    : null;

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'history', label: `History (${history.length})` },
    { id: 'ai', label: '🤖 AI Insights' },
  ];

  return (
    <Modal isOpen title="Task Details" onClose={onClose} size="lg">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-blue-50 rounded-xl p-3 text-center">
          <div className="text-lg font-bold text-blue-700">{history.length}</div>
          <div className="text-xs text-blue-600">Past Runs</div>
        </div>
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <div className="text-lg font-bold text-green-700">{avgEffort ? `${avgEffort}h` : '—'}</div>
          <div className="text-xs text-green-600">Avg Effort</div>
        </div>
        <div className="bg-purple-50 rounded-xl p-3 text-center">
          <div className="text-lg font-bold text-purple-700">
            {daysSinceLast !== null ? `${daysSinceLast}d` : '—'}
          </div>
          <div className="text-xs text-purple-600">Days Ago</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-4 overflow-x-auto">
        {TABS.map(tb => (
          <button key={tb.id} onClick={() => { setTab(tb.id as any); if (tb.id === 'ai' && !summary) loadSummary(); }}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${tab === tb.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-900'}`}>
            {tb.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-700 leading-relaxed">{task.overview}</p>
          {lastPerformed && (
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Last Performed</div>
              <div className="text-sm text-gray-700">
                {new Date(lastPerformed.completed_at).toLocaleDateString()} ({daysSinceLast} days ago)
              </div>
              {lastPerformed.work_description && (
                <p className="text-sm text-gray-600 mt-2 italic">"{lastPerformed.work_description}"</p>
              )}
            </div>
          )}
          {avgEffort && (
            <div className="flex gap-3">
              <div className="flex-1 bg-blue-50 rounded-xl p-3">
                <div className="text-xs text-blue-600 mb-1">Average Effort</div>
                <div className="font-bold text-blue-800">{avgEffort} hours</div>
              </div>
              {avgCrew && (
                <div className="flex-1 bg-green-50 rounded-xl p-3">
                  <div className="text-xs text-green-600 mb-1">Average Crew</div>
                  <div className="font-bold text-green-800">{avgCrew} people</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No history available yet</div>
          ) : history.map((h: any, i: number) => (
            <div key={i} className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-900">
                  {h.completed_at ? new Date(h.completed_at).toLocaleDateString() : '—'}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>⏱ {h.actual_hours || '—'}h</span>
                  <span>👥 {h.crew_count || 0}</span>
                </div>
              </div>
              {h.work_description && (
                <p className="text-sm text-gray-600 mb-2">{h.work_description}</p>
              )}
              {h.problems && (
                <div className="bg-orange-50 rounded-lg p-2">
                  <div className="text-xs font-medium text-orange-700 mb-0.5">⚠️ Problems</div>
                  <p className="text-xs text-orange-600">{h.problems}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'ai' && (
        <div className="space-y-4">
          {!task.required_task_id ? (
            <div className="text-center py-8 text-gray-400">AI insights available only for recurring tasks</div>
          ) : summaryLoading ? (
            <div className="flex flex-col items-center py-8 gap-3">
              <div className="animate-spin text-4xl">🤖</div>
              <div className="text-gray-500 text-sm">Generating insights from task history...</div>
            </div>
          ) : summary ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🤖</span>
                <span className="font-medium text-gray-900">AI Analysis</span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Powered by Claude</span>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {summary}
              </div>
              <button onClick={loadSummary} className="mt-3 text-xs text-blue-600 hover:text-blue-800">
                🔄 Refresh analysis
              </button>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🤖</div>
              <button onClick={loadSummary} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">
                Generate AI Insights
              </button>
              <p className="text-xs text-gray-500 mt-2">Analyses previous executions to provide tips</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
