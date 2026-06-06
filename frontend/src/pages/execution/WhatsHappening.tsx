import { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../../contexts/AppContext';
import { api } from '../../api/client';
import PriorityBadge from '../../components/PriorityBadge';
import StateBadge from '../../components/StateBadge';
import TaskManageModal from '../../components/TaskManageModal';

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function WhatsHappening() {
  const { team, user } = useApp();
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const initialExpansionSet = useRef(false);

  const today = new Date().toISOString().slice(0, 10);
  const in7Days = addDays(today, 7);
  const in30Days = addDays(today, 30);

  const load = useCallback(async () => {
    if (!team || !user) return;
    setLoading(true);
    try {
      const [mine, all] = await Promise.all([
        api.getScheduledTasks(team.id, { view: 'mine', user_id: String(user.id) }),
        api.getScheduledTasks(team.id),
      ]);
      setMyTasks(mine);
      setAllTasks(all);
    } finally {
      setLoading(false);
    }
  }, [team?.id, user?.id]);

  useEffect(() => { load(); }, [load]);

  // Set initial expansion once after first data load
  useEffect(() => {
    if (loading || initialExpansionSet.current) return;
    initialExpansionSet.current = true;

    const hasYourDay = myTasks.some(t =>
      t.scheduled_date === today ||
      (t.scheduled_date && t.scheduled_date < today && t.state === 'pending')
    );
    const hasPrepare = myTasks.some(t =>
      t.state === 'pending' && t.scheduled_date && t.scheduled_date > today && t.scheduled_date <= in30Days
    );
    const hasHappening = allTasks.some(t =>
      t.scheduled_date && t.scheduled_date >= today && t.scheduled_date <= in7Days
    );

    if (hasYourDay) setExpanded(new Set(['your-day']));
    else if (hasPrepare) setExpanded(new Set(['prepare']));
    else if (hasHappening) setExpanded(new Set(['happening']));
    else setExpanded(new Set(['volunteer']));
  }, [loading]);

  const toggle = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const getInvolvement = (task: any) => {
    if (task.responsible_user_id === user?.id)
      return { label: 'Responsible', color: 'bg-blue-100 text-blue-700' };
    if (task.crew?.some((c: any) => c.id === user?.id))
      return { label: 'Crew', color: 'bg-green-100 text-green-700' };
    if (task.participants === 'all_expected')
      return { label: 'All Expected', color: 'bg-purple-100 text-purple-700' };
    if (task.participants === 'open_optional')
      return { label: 'Open', color: 'bg-teal-100 text-teal-700' };
    return null;
  };

  // Section data
  const todayTasks = myTasks.filter(t => t.scheduled_date === today);
  const overdueTasks = myTasks.filter(t =>
    t.scheduled_date && t.scheduled_date < today && t.state === 'pending'
  );
  const prepareTasks = myTasks
    .filter(t => t.state === 'pending' && t.scheduled_date && t.scheduled_date > today && t.scheduled_date <= in30Days)
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
  const happeningTasks = allTasks
    .filter(t => t.scheduled_date && t.scheduled_date >= today && t.scheduled_date <= in7Days)
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
  const volunteerTasks = allTasks
    .filter(t => t.state === 'pending' && t.participation_type === 'open' &&
      (t.participants === 'open_optional' || t.participants === 'all_expected') &&
      (!t.volunteer_limit || (t.crew?.length || 0) < t.volunteer_limit))
    .sort((a, b) => (a.scheduled_date || '').localeCompare(b.scheduled_date || ''));

  return (
    <div className="flex flex-col">
      <div className="bg-white border-b px-4 py-3 sticky top-16 z-20">
        <h1 className="font-bold text-gray-900 text-lg">What's Happening</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {new Date().toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      <div className="p-3 space-y-2">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : (
          <>
            {/* Your Day */}
            <Section
              id="your-day"
              title="Your Day"
              count={todayTasks.length + overdueTasks.length}
              expanded={expanded.has('your-day')}
              onToggle={() => toggle('your-day')}
              accent="border-l-blue-500">
              {todayTasks.length === 0 && overdueTasks.length === 0 ? (
                <EmptyState>Nothing scheduled for you today.</EmptyState>
              ) : (
                <>
                  {todayTasks.length > 0 && (
                    <>
                      <div className="px-3 pt-2.5 pb-1 text-xs font-semibold text-blue-700 uppercase tracking-wide">
                        Today — {new Date().toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                      </div>
                      {todayTasks.map(task => (
                        <TaskItem key={task.id} task={task} inv={getInvolvement(task)}
                          onClick={() => setSelectedTask(task)} />
                      ))}
                    </>
                  )}
                  {overdueTasks.length > 0 && (
                    <>
                      <div className="px-3 pt-2.5 pb-1 text-xs font-semibold text-red-600 uppercase tracking-wide">
                        ⚠️ Overdue
                      </div>
                      {overdueTasks.map(task => (
                        <TaskItem key={task.id} task={task} inv={getInvolvement(task)} overdue
                          onClick={() => setSelectedTask(task)} />
                      ))}
                    </>
                  )}
                </>
              )}
            </Section>

            {/* Prepare */}
            <Section
              id="prepare"
              title="Prepare"
              count={prepareTasks.length}
              subtitle="Your pending tasks in the next 30 days"
              expanded={expanded.has('prepare')}
              onToggle={() => toggle('prepare')}
              accent="border-l-green-500">
              {prepareTasks.length === 0 ? (
                <EmptyState>No upcoming tasks in the next month.</EmptyState>
              ) : (
                prepareTasks.map(task => (
                  <TaskItem key={task.id} task={task} inv={getInvolvement(task)}
                    showDate showCrew onClick={() => setSelectedTask(task)} />
                ))
              )}
            </Section>

            {/* What's Happening */}
            <Section
              id="happening"
              title="What's Happening"
              count={happeningTasks.length}
              subtitle="All team tasks in the next 7 days"
              expanded={expanded.has('happening')}
              onToggle={() => toggle('happening')}
              accent="border-l-purple-500">
              {happeningTasks.length === 0 ? (
                <EmptyState>Nothing scheduled for the team this week.</EmptyState>
              ) : (
                happeningTasks.map(task => (
                  <TaskItem key={task.id} task={task}
                    showDate showResponsible showCrew onClick={() => setSelectedTask(task)} />
                ))
              )}
            </Section>

            {/* Volunteer */}
            <Section
              id="volunteer"
              title="Volunteer"
              count={volunteerTasks.length}
              subtitle="Tasks seeking crew members"
              expanded={expanded.has('volunteer')}
              onToggle={() => toggle('volunteer')}
              accent="border-l-orange-400">
              {volunteerTasks.length === 0 ? (
                <EmptyState>No tasks currently seeking crew.</EmptyState>
              ) : (
                volunteerTasks.map(task => (
                  <TaskItem key={task.id} task={task} showDate seekingCrew onClick={() => setSelectedTask(task)} />
                ))
              )}
            </Section>
          </>
        )}
      </div>

      {selectedTask && (
        <TaskManageModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onRefresh={load}
        />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ id, title, subtitle, count, expanded, onToggle, accent, children }: any) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 border-l-4 ${accent} overflow-hidden shadow-sm`}>
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-gray-800 text-sm">{title}</span>
          {count > 0 && (
            <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full font-medium">{count}</span>
          )}
          {subtitle && !expanded && (
            <span className="text-xs text-gray-400 hidden sm:inline truncate">{subtitle}</span>
          )}
        </div>
        <span className="text-gray-400 text-xs ml-2 shrink-0">{expanded ? '▼' : '▶'}</span>
      </button>
      {expanded && <div className="border-t border-gray-100">{children}</div>}
    </div>
  );
}

function TaskItem({ task, inv, overdue, showDate, showCrew, showResponsible, seekingCrew, onClick }: any) {
  const daysOverdue = overdue && task.scheduled_date
    ? Math.floor((new Date().getTime() - new Date(task.scheduled_date + 'T00:00:00').getTime()) / 86400000)
    : 0;

  const dateStr = task.scheduled_date
    ? new Date(task.scheduled_date + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' })
    : null;

  return (
    <button onClick={onClick}
      className={`w-full text-left px-3 py-2.5 border-b border-gray-50 last:border-0 transition-colors ${overdue ? 'hover:bg-red-50' : 'hover:bg-gray-50'}`}>
      <div className="flex items-start gap-2">
        {/* Date prefix (Prepare / Happening) */}
        {showDate && (
          <span className={`text-xs font-medium shrink-0 mt-0.5 w-12 ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
            {overdue ? `${daysOverdue}d ago` : (dateStr ?? '—')}
          </span>
        )}

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-medium leading-snug ${overdue ? 'text-red-800' : 'text-gray-900'}`}>
            {task.short_description}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {inv && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${inv.color}`}>{inv.label}</span>
            )}
            {showResponsible && task.responsible_user_name && (
              <span className="text-xs text-gray-500">👤 {task.responsible_user_name}</span>
            )}
            {showCrew && (task.crew?.length ?? 0) > 0 && (
              <span className="text-xs text-gray-500">👥 {task.crew.length}</span>
            )}
            {seekingCrew && (
              <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-medium">seeking crew</span>
            )}
            <PriorityBadge priority={task.priority} />
          </div>
        </div>

        {/* State badge */}
        <StateBadge state={task.state} />
      </div>
    </button>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-5 text-sm text-gray-400 text-center">{children}</div>;
}
