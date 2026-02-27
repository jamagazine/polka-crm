import { useState, useEffect } from 'react';

/**
 * Хук для создания задержки перед обновлением значения.
 * Полезен для оптимизации полей ввода, таких как поиск, чтобы не отправлять
 * запросы или не фильтровать данные на каждое нажатие клавиши.
 *
 * @param value Значение, которое нужно дебаунсить
 * @param delay Задержка в миллисекундах (по умолчанию 300ms)
 * @returns Дебаунснутое значение
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Устанавливаем таймер для обновления debouncedValue после задержки
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Очищаем таймер, если value меняется до истечения задержки (например, пользователь продолжает печатать)
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
