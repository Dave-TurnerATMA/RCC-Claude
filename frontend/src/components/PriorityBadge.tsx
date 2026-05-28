import { useTranslation } from 'react-i18next';

interface Props { priority: string; size?: 'sm' | 'md'; }

export default function PriorityBadge({ priority, size = 'sm' }: Props) {
  const { t } = useTranslation();
  const colors: Record<string, string> = {
    urgent: 'bg-red-100 text-red-800 border border-red-200',
    high: 'bg-orange-100 text-orange-800 border border-orange-200',
    medium: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    low: 'bg-green-100 text-green-800 border border-green-200',
  };
  const sz = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';
  return (
    <span className={`${sz} rounded-full font-medium ${colors[priority] || 'bg-gray-100 text-gray-600'}`}>
      {t(`priority.${priority}`)}
    </span>
  );
}
