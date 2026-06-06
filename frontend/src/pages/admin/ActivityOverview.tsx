import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { useApp } from '../../contexts/AppContext';
import StateBadge from '../../components/StateBadge';
import TaskManageModal from '../../components/TaskManageModal';
import { SubTaskForm } from './PlannedTasks';

const TODAY = new Date().toISOString().slice(0, 10);

function fmtDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function DisplayStateBadge({ label, color }: { label: string; color: string }) {
  const colorMap: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-500',
    red: 'bg-red-100 text-red-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    blue: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
    green: 'bg-green-100 text-green-700',
    orange: 'bg-orange-100 text-orange-700',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap flex-shrink-0 ${colorMap[color] || colorMap.gray}`}>
      {label}
    </span>
  );
}

function getRtDisplayState(rt: any, stsByRtId: Record<number, any[]>): { label: string; color: string } {
  if (!rt.scheduled_date) return { label: 'Unplanned', color: 'gray' };
  const sts = (stsByRtId[rt.id] || []).sort((a: any, b: any) =>
    (a.scheduled_date || '').localeCompare(b.scheduled_date || '')
  );
  if (sts.length === 0) {
    if (rt.completion_count > 0) return { label: 'Completed', color: 'green' };
    return { label: 'Scheduled', color: 'purple' };
  }
  const current = sts.find((s: any) => s.state === 'pending') || sts[0];
  if (current.state === 'pending' && current.scheduled_date && current.scheduled_date < TODAY) {
    return { label: 'Overdue', color: 'red' };
  }
  if (current.state === 'pending') return { label: 'Pending', color: 'yellow' };
  if (current.state === 'planned') return { label: 'Planned', color: 'blue' };
  return { label: current.state, color: 'gray' };
}

function getRtEffectiveDate(rt: any, stsByRtId: Record<number, any[]>): string {
  const sts = stsByRtId[rt.id] || [];
  const earliest = [...sts]
    .filter((s: any) => s.scheduled_date)
    .sort((a: any, b: any) => a.scheduled_date.localeCompare(b.scheduled_date))[0];
  return earliest?.scheduled_date || rt.scheduled_date || '';
}

interface RtRowProps {
  rt: any;
  displayState: { label: string; color: string };
  effectiveDate: string;
  groupName?: string;
  showDate: boolean;
  showGroup: boolean;
  onClick: () => void;
}

function RtRow({ rt, displayState, effectiveDate, groupName, showDate, showGroup, onClick }: RtRowProps) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50 last:border-0"
    >
      <span className="text-sm flex-shrink-0 w-5 text-center">{rt.type === 'recurring' ? '🔄' : '📌'}</span>
      <span className="text-sm text-gray-900 flex-1 truncate min-w-0">{rt.short_description}</span>
      {showGroup && groupName && (
        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full flex-shrink-0 hidden sm:inline">{groupName}</span>
      )}
      {showDate && effectiveDate && (
        <span className="text-xs text-gray-400 flex-shrink-0">{fmtDate(effectiveDate)}</span>
      )}
      <DisplayStateBadge label={displayState.label} color={displayState.color} />
    </div>
  );
}

export default function ActivityOverview() {
  const { t } = useTranslation();
  const { team } = useApp();
  const [view, setView] = useState<'planned' | 'adhoc'>('planned');
  const [sortByDate, setSortByDate] = useState(false);
  const [mainTasks, setMainTasks] = useState<any[]>([]);
  const [activeSTs, setActiveSTs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [editTask, setEditTask] = useState<any>(null);
  const [manageTask, setManageTask] = useState<any>(null);

  const load = useCallback(async () => {
    if (!team) return;
    setLoading(true);
    try {
      const [mts, sts, usersData, eqData] = await Promise.all([
        api.getMainTasks(team.id),
        api.getScheduledTasks(team.id),
        api.getUsers(team.id),
        api.getEquipment(team.id),
      ]);
      setMainTasks(mts);
      setActiveSTs(sts);
      setUsers(usersData.filter((u: any) => u.status === 'active'));
      setEquipment(eqData);
      setExpandedGroups(new Set(mts.map((mt: any) => mt.id)));
    } finally {
      setLoading(false);
    }
  }, [team?.id]);

  useEffect(() => { load(); }, [load]);

  // Build stsByRtId from active STs
  const stsByRtId = activeSTs.reduce((acc: Record<number, any[]>, st: any) => {
    if (st.required_task_id) {
      if (!acc[st.required_task_id]) acc[st.required_task_id] = [];
      acc[st.required_task_id].push(st);
    }
    return acc;
  }, {});

  const toggleGroup = (id: number) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Flatten all required tasks from main_tasks
  const allRequiredTasks = mainTasks.flatMap((mt: any) => (mt.sub_tasks || []).map((rt: any) => ({ ...rt, _groupName: mt.short_description })));

  const sortedByDateRts = [...allRequiredTasks].sort((a, b) => {
    const da = getRtEffectiveDate(a, stsByRtId);
    const db = getRtEffectiveDate(b, stsByRtId);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da.localeCompare(db);
  });

  const adhocTasks = activeSTs
    .filter((st: any) => !st.required_task_id)
    .sort((a: any, b: any) => (a.scheduled_date || '').localeCompare(b.scheduled_date || ''));

  return (
    <div className="flex flex-col">
      <div className="bg-white border-b px-4 py-3 sticky top-16 z-20">
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-bold text-gray-900 text-lg">{t('nav.activityOverview')}</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setView('planned')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                view === 'planned' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Planned
            </button>
            <button
              onClick={() => setView('adhoc')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                view === 'adhoc' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Adhoc
              {adhocTasks.length > 0 && (
                <span className="ml-1 bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">{adhocTasks.length}</span>
              )}
            </button>
          </div>
          {view === 'planned' && (
            <label className="flex items-center gap-1.5 cursor-pointer ml-1">
              <input
                type="checkbox"
                checked={sortByDate}
                onChange={e => setSortByDate(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-blue-600"
              />
              <span className="text-xs text-gray-600">Sort by date</span>
            </label>
          )}
        </div>
      </div>

      <div className="p-2 space-y-2">
        {loading ? (
          <div className="text-center py-12 text-gray-400">{t('common.loading')}</div>
        ) : view === 'planned' ? (
          sortByDate ? (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {sortedByDateRts.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">No planned tasks found</div>
              ) : (
                sortedByDateRts.map(rt => (
                  <RtRow
                    key={rt.id}
                    rt={rt}
                    displayState={getRtDisplayState(rt, stsByRtId)}
                    effectiveDate={getRtEffectiveDate(rt, stsByRtId)}
                    groupName={rt._groupName}
                    showDate
                    showGroup
                    onClick={() => setEditTask(rt)}
                  />
                ))
              )}
            </div>
          ) : (
            <>
              {mainTasks.map(mt => {
                const subTasks = mt.sub_tasks || [];
                if (subTasks.length === 0) return null;
                const expanded = expandedGroups.has(mt.id);
                return (
                  <div key={mt.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <button
                      onClick={() => toggleGroup(mt.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100 text-left"
                    >
                      <span className="text-xs font-bold text-gray-700 flex-1">{mt.short_description}</span>
                      <span className="text-xs text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded-full">{subTasks.length}</span>
                      <span className="text-gray-400 text-xs">{expanded ? '▼' : '▶'}</span>
                    </button>
                    {expanded && (
                      <div>
                        {subTasks.map((rt: any) => (
                          <RtRow
                            key={rt.id}
                            rt={rt}
                            displayState={getRtDisplayState(rt, stsByRtId)}
                            effectiveDate={getRtEffectiveDate(rt, stsByRtId)}
                            showDate={false}
                            showGroup={false}
                            onClick={() => setEditTask(rt)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {allRequiredTasks.length === 0 && (
                <div className="text-center py-16">
                  <div className="text-5xl mb-3">📋</div>
                  <div className="font-medium text-gray-700">No planned tasks yet</div>
                  <div className="text-sm text-gray-500 mt-1">Add tasks to see them here</div>
                </div>
              )}
            </>
          )
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {adhocTasks.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">✅</div>
                <div className="font-medium text-gray-700">No adhoc tasks</div>
                <div className="text-sm text-gray-500 mt-1">All active tasks are linked to a planned task</div>
              </div>
            ) : (
              adhocTasks.map((st: any) => (
                <div
                  key={st.id}
                  onClick={() => setManageTask(st)}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50 last:border-0"
                >
                  <span className="text-sm text-gray-900 flex-1 truncate min-w-0">{st.short_description}</span>
                  {st.scheduled_date && (
                    <span className="text-xs text-gray-400 flex-shrink-0">{fmtDate(st.scheduled_date)}</span>
                  )}
                  {st.responsible_user_name && (
                    <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:inline">{st.responsible_user_name}</span>
                  )}
                  <StateBadge state={st.state} />
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {editTask && (
        <SubTaskForm
          task={editTask}
          users={users}
          equipment={equipment}
          mainTasks={mainTasks}
          onClose={() => { setEditTask(null); load(); }}
        />
      )}

      {manageTask && (
        <TaskManageModal
          task={manageTask}
          onClose={() => setManageTask(null)}
          onRefresh={load}
        />
      )}
    </div>
  );
}
