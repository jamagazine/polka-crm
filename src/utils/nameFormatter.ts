export function formatShortName(fullName: string): string {
    if (!fullName) return '';

    // Отделяем кавычки в конце, если они есть
    const quoteMatch = fullName.match(/\s+".*?"$/);
    const suffix = quoteMatch ? quoteMatch[0] : '';
    const baseName = quoteMatch ? fullName.replace(quoteMatch[0], '') : fullName;

    // 1. Исключения (Организации, системные теги, товары, кавычки в середине)
    if (/(^|\s)(ООО|ИП|ТЦ)(?=\s|[.,-]|$)|(0_ПОСТАВЩИК|Клаудшоп|CloudShop|изделия|Полка)/i.test(baseName) || /"/.test(baseName)) {
        return fullName;
    }

    // 2. Уже содержит сокращения с точкой
    if (/\.[ \w]/.test(baseName)) return fullName;

    // Разбиваем строку
    const parts = baseName.trim().split(/\s+/);

    // Если частей меньше 2 — возвращаем как есть
    if (parts.length < 2) return fullName;

    const lastName = parts[0];
    const firstName = parts[1][0].toUpperCase() + '.';
    const patronymic = parts[2] ? ' ' + parts[2][0].toUpperCase() + '.' : '';

    return `${lastName} ${firstName}${patronymic}${suffix}`;
}
