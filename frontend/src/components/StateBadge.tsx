import { useTranslation } from 'react-i18next';

interface Props { state: string; size?: 'sm' | 'md'; }

export default function StateBadge({ state, size = 'sm' }: Props) {
  const { t } = useTranslation();
  const colors: Record<string, string> = {
    pending: 'bg-blue-100 text-blue-800 border border-blue-200',
    planned: 'bg-purple-100 text-purple-800 border border-purple-200',
    completed: 'bg-green-100 text-green-800 border border-green-200',
    abandoned: 'bg-gray-100 text-gray-600 border border-gray-200',
    not_required: 'bg-gray-100 text-gray-500 border border-gray-200',
    missed: 'bg-red-100 text-red-700 border border-red-200',
  };
  const sz = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';
  return (
    <span className={`${sz} rounded-full font-medium ${colors[state] || 'bg-gray-100 text-gray-600'}`}>
      {t(`state.${state}`, state)}
    </span>
  );
}
