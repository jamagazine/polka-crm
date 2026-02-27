/**
 * Централизованные CSS custom property ссылки.
 * Используй вместо строковых литералов в style={{...}}.
 */
export const CSS = {
    border: 'var(--polka-border)',
    bgLight: 'var(--polka-bg-light)',
    bg: 'var(--polka-bg, #fff)',
    accent: 'var(--polka-accent)',
    green: 'var(--polka-green)',
    gray: 'var(--polka-gray)',
} as const;
