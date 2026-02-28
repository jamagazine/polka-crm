import { create } from 'zustand';

export type LogType = 'info' | 'warn' | 'error' | 'success';

export interface LogEntry {
    timestamp: number;
    message: string;
    type: LogType;
}

interface AppLoggerState {
    logs: LogEntry[];
    addLog: (message: string, type?: LogType) => void;
    clearLogs: () => void;
}

const MAX_LOGS = 200;

export const useAppLogger = create<AppLoggerState>((set) => ({
    logs: [],
    addLog: (message, type = 'info') => set((state) => ({
        logs: [
            ...state.logs.slice(-(MAX_LOGS - 1)),
            { timestamp: Date.now(), message, type }
        ]
    })),
    clearLogs: () => set({ logs: [] }),
}));

/** Standalone-функция для вызова из любого места (без хука) */
export function appLog(message: string, type: LogType = 'info') {
    useAppLogger.getState().addLog(message, type);
}
