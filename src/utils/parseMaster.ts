import { type Master } from '../api/client';

export interface ParsedMasterData {
    isSystem: boolean;
    isArchived: boolean;
    parsedCity: string;
    parsedCategory: string;
    cleanName: string;
    sortKey: string;
    parsedPhone: string;
    parsedPaymentMethod: string;
    parsedBanks: string;
    parsedNotes: string;
    parsedLeaveDate: number | null;
    lastReturnDate: number | null;
}

export function parseMasterData(master: Partial<Master>): ParsedMasterData {
    const rawName = master.name || '';
    if (!rawName) {
        return {
            isSystem: false,
            isArchived: false,
            parsedCity: '',
            parsedCategory: '',
            cleanName: '',
            sortKey: '',
            parsedPhone: '',
            parsedPaymentMethod: '',
            parsedBanks: '',
            parsedNotes: '',
            parsedLeaveDate: null,
            lastReturnDate: null
        };
    }

    let parsed = rawName;

    // 1. Технические позиции
    const isSystem = parsed.includes('`');

    // 2. Метка Архива
    const isArchived = parsed.includes('(Архив)');
    if (isArchived) {
        parsed = parsed.replace(/\(Архив\)/i, '');
    }

    // 3. |...| для Заметок
    let extractedNotes: string[] = [];
    const pipeMatches = [...parsed.matchAll(/\|(.*?)\|/g)];
    for (const match of pipeMatches) {
        extractedNotes.push(match[1].trim());
    }
    parsed = parsed.replace(/\|.*?\|/g, '');

    // 4. Город (в квадратных скобках)
    let parsedCity = '';
    const cityMatch = parsed.match(/\[(.*?)\]/);
    if (cityMatch) {
        parsedCity = cityMatch[1].trim();
        parsed = parsed.replace(/\[.*?\]/, '');
    }

    // 5. Категория (в круглых скобках)
    let parsedCategory = '';
    const categoryMatch = parsed.match(/\((.*?)\)/);
    if (categoryMatch) {
        parsedCategory = categoryMatch[1].trim();
        parsed = parsed.replace(/\(.*?\)/, '');
    }

    // 6. Чистое имя
    const cleanName = parsed.replace(/['«»‘’]/g, '').trim().replace(/\s{2,}/g, ' ');

    // 7. Ключ сортировки
    let sortKey = cleanName.toLowerCase();
    sortKey = sortKey.replace(/"/g, '');
    sortKey = sortKey.replace(/\b(ип|ооо|оао|чп)\b\s*/g, '');
    sortKey = sortKey.trim();

    // 8. Умный поиск телефонов (Светофор)
    const phoneCandidates = [
        ...(master.phones || []),
        master.site || '',
        master.description || '',
        (master as any).account_number || '', // if it's there
        master.name || ''
    ];
    let allTextForPhones = phoneCandidates.filter(Boolean).join(' ');

    const validPhonesList: string[] = [];
    const invalidPhonesList: string[] = [];
    const seenDigits = new Set<string>();

    const evaluateNumber = (rawMatch: string) => {
        const digits = rawMatch.replace(/\D/g, '');
        if (digits.length < 6 || digits.length > 12) return;
        if (seenDigits.has(digits)) return;
        seenDigits.add(digits);

        const hasLetters = /[a-zA-Zа-яА-ЯёЁ]/.test(rawMatch);

        if (!hasLetters && digits.length === 10 && digits.startsWith('9')) {
            validPhonesList.push(`+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 10)}`);
        } else if (!hasLetters && digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
            validPhonesList.push(`+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`);
        } else {
            invalidPhonesList.push(`!!! ${rawMatch}`);
        }
    };

    // Сначала ищем телефоны с пробелами/тире
    const spacedPattern = /(?:\+?\d[\d\s\-\(\)]{4,20}\d)/g;
    const spMatches = allTextForPhones.match(spacedPattern) || [];
    for (const match of spMatches) {
        const clean = match.trim();
        const d = clean.replace(/\D/g, '');
        if (d.length >= 6 && d.length <= 15) {
            evaluateNumber(clean);
        }
        allTextForPhones = allTextForPhones.replace(match, ' ');
    }

    // Потом ищем оставшиеся цельные слова ("каша")
    const words = allTextForPhones.split(/\s+/);
    for (const w of words) {
        const d = w.replace(/\D/g, '');
        if (d.length >= 6 && d.length <= 15) {
            evaluateNumber(w);
        }
    }

    const allPhones = [...validPhonesList, ...invalidPhonesList];
    let parsedPhone = '';
    const additionalPhones: string[] = [];
    if (allPhones.length > 0) {
        parsedPhone = allPhones[0];
        if (allPhones.length > 1) {
            additionalPhones.push(...allPhones.slice(1));
        }
    }

    // 9. Словари: Метод оплаты и Банки (ищем по всему сырому объекту)
    const textForBanks = JSON.stringify(master).toLowerCase();

    const banksFound: string[] = [];
    if (/сбер|сб|зеленый|сбербанк/.test(textForBanks)) banksFound.push('Сбербанк');
    if (/т-банк|тиньк|тинькофф|желтый|карта т/.test(textForBanks)) banksFound.push('Т-Банк');
    if (/\bвтб\b|синий/.test(textForBanks)) banksFound.push('ВТБ');
    if (/раф|райф|райфайзен|райфай/.test(textForBanks)) banksFound.push('Райффайзен');
    if (/альф|альфа|красный/.test(textForBanks)) banksFound.push('Альфа-Банк');
    if (/юмани|yoomoney|яндекс/.test(textForBanks)) banksFound.push('ЮMoney');
    if (/\bмтс\b/.test(textForBanks)) banksFound.push('МТС Банк');
    if (/озон|ozon/.test(textForBanks)) banksFound.push('Озон Банк');

    const parsedBanks = banksFound.join(', ');

    let paymentMethods: string[] = [];
    if (/нал\b|наличные/.test(textForBanks)) {
        paymentMethods.push('Наличные');
    }
    if (/карта|перевод|безнал|счет|сбп/.test(textForBanks) || banksFound.length > 0) {
        paymentMethods.push('Перевод');
    }
    const parsedPaymentMethod = paymentMethods.join(', ');

    // 10. Поиск даты ухода (Архив)
    let parsedLeaveDate: number | null = null;
    const leaveRegex = /(?:ушел|ушла|ушёл|возврат|увольнение)[^\d]*(\d{1,2}[\.\-\/]\d{1,2}[\.\-\/]\d{2,4})/i;
    const leaveMatch = textForBanks.match(leaveRegex);
    if (leaveMatch && leaveMatch[1]) {
        const parts = leaveMatch[1].split(/[\.\-\/]/);
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            let year = parseInt(parts[2], 10);
            if (year < 100) year += 2000;
            const d = new Date(year, month, day);
            if (!isNaN(d.getTime())) {
                parsedLeaveDate = d.getTime();
            }
        }
    }

    // 11. Сборка Заметок
    const notesParts: string[] = [];
    if (extractedNotes.length > 0) notesParts.push(...extractedNotes);
    if (additionalPhones.length > 0) notesParts.push(...additionalPhones);
    if (master.description) notesParts.push(`Опис: ${master.description.trim()}`);
    if ((master as any).account_number) notesParts.push(`Счет: ${(master as any).account_number.trim()}`);

    const parsedNotes = notesParts.join(' | ');

    return {
        isSystem,
        isArchived,
        parsedCity,
        parsedCategory,
        cleanName,
        sortKey,
        parsedPhone,
        parsedPaymentMethod,
        parsedBanks,
        parsedNotes,
        parsedLeaveDate,
        lastReturnDate: null
    };
}
