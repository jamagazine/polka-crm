// ─── Системные контакты ───────────────────────────────────────────────────────

const BASE_SYSTEM_CONTACTS = [
    '`0_ПОСТАВЩИК по умолчанию',
    '`Клаудшоп CloudShop',
    '`Полка',
    '`ТЦ Союз'
];

export function isSystemContact(name: string | undefined | null): boolean {
    if (!name) return false;
    const lowerName = name.toLowerCase();
    return BASE_SYSTEM_CONTACTS.includes(name) || lowerName.includes('полка');
}
