import { ReviewStatusValue } from '../types';

interface StatusSelectorProps {
  currentStatus: ReviewStatusValue;
  onStatusChange: (newStatus: ReviewStatusValue) => void;
}

const statuses: { value: ReviewStatusValue; label: string }[] = [
  { value: 'pending', label: '未着手' },
  { value: 'reviewing', label: 'レビュー中' },
  { value: 'commented', label: 'コメントあり' },
  { value: 'approved', label: '承認' },
];

function StatusSelector({ currentStatus, onStatusChange }: StatusSelectorProps) {
  return (
    <div className="status-selector">
      {statuses.map(({ value, label }) => (
        <button
          key={value}
          className={`${value} ${currentStatus === value ? 'active' : ''}`}
          onClick={() => onStatusChange(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default StatusSelector;
