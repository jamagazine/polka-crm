/**
 * Безопасный логгер: выводит данные только в dev-режиме.
 * В продакшн-бандле все вызовы log/logError — no-op.
 */

/* eslint-disable no-console */

export const log = (...args: unknown[]): void => {
    if (import.meta.env.DEV) {
        console.log(...args);
    }
};

export const logError = (...args: unknown[]): void => {
    if (import.meta.env.DEV) {
        console.error(...args);
    }
};
