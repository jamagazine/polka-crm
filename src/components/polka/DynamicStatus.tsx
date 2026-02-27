import { useState, useEffect } from 'react';
import { CheckCircle2, Info } from 'lucide-react';

interface StatusMessage {
  text: string;
  type: 'success' | 'info';
  duration?: number;
}

interface DynamicStatusProps {
  staticStatus: string;
  showIcon?: boolean;
}

export function DynamicStatus({ staticStatus, showIcon = false }: DynamicStatusProps) {
  const [dynamicStatus, setDynamicStatus] = useState<StatusMessage | null>(null);

  // Симуляция динамических статусов (для демо)
  useEffect(() => {
    const showDynamicStatus = (status: StatusMessage) => {
      setDynamicStatus(status);
      setTimeout(() => {
        setDynamicStatus(null);
      }, status.duration || 3000);
    };

    // Пример: показываем "Сохранено" через 5 секунд
    const timer = setTimeout(() => {
      showDynamicStatus({
        text: 'Изменения сохранены',
        type: 'success',
        duration: 3000,
      });
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const currentStatus = dynamicStatus || { text: staticStatus, type: 'info' as const };
  const isDynamic = dynamicStatus !== null;

  if (showIcon) {
    // Icon-only mode (для режима 1 - обе панели открыты)
    return (
      <button
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 transition-all"
        title={currentStatus.text}
      >
        {currentStatus.type === 'success' ? (
          <CheckCircle2
            className={`w-4 h-4 transition-all ${isDynamic ? 'animate-in fade-in' : ''}`}
            style={{ color: isDynamic ? 'var(--polka-green)' : 'var(--polka-gray)' }}
          />
        ) : (
          <Info className="w-4 h-4" style={{ color: 'var(--polka-gray)' }} />
        )}
      </button>
    );
  }

  // Text mode (для режимов 2-3)
  return (
    <div
      className={`flex items-center gap-2 transition-all ${
        isDynamic ? 'animate-in fade-in slide-in-from-left-2' : ''
      }`}
    >
      {currentStatus.type === 'success' ? (
        <CheckCircle2
          className="w-4 h-4 flex-shrink-0"
          style={{ color: isDynamic ? 'var(--polka-green)' : 'var(--polka-gray)' }}
        />
      ) : (
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: 'var(--polka-green)' }}
        />
      )}
      <span className="text-sm text-gray-600 whitespace-nowrap">{currentStatus.text}</span>
    </div>
  );
}
