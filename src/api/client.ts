/* ─── API-клиент для CloudShop ─── */

import { log, logError } from '../utils/logger';

const BASE = '/api-cs';

// ─── Типы ────────────────────────────────────────────────────────────────────

export interface Master {
    _id: string;
    name: string;
    type?: string;
    phones?: string[];
    emails?: string[];
    description?: string;
    address?: { actual?: string };
    userName?: string;
    created?: string;
    site?: string;

    // Поля, заполняемые на клиенте при парсинге имени
    isSystem?: boolean;
    isArchived?: boolean;
    status?: number;
    parsedCity?: string;
    parsedCategory?: string;
    cleanName?: string;
    sortKey?: string;
    parsedPhone?: string;
    parsedPaymentMethod?: string;
    parsedBanks?: string;
    parsedNotes?: string;
    parsedLeaveDate?: number | null;
    lastReturnDate?: number | null;
}

/**
 * Авторизация в CloudShop.
 * POST /api-cs/auth → проксируется на https://web.cloudshop.ru/auth
 */
export async function login(email: string, password: string): Promise<Response> {
    log('[AUTH API] Начинаю запрос авторизации...', { email });

    try {
        const res = await fetch(`${BASE}/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ login: email, password }),
        });

        log('[AUTH API] Ответ получен:', res.status, res.statusText);
        return res;
    } catch (err) {
        logError('[AUTH API] Ошибка сети:', err);
        throw err;
    }
}

/**
 * Список поставщиков (мастеров) из CloudShop.
 * GET /api-cs/proxy/?path=...suppliers...
 */
export async function fetchMasters(): Promise<Master[]> {
    const url =
        `${BASE}/proxy/?path=%2Fdata%2F60513087cb4d27a35ac17b13%2Fsuppliers&api=v3&timezone=18000`;

    log('[MASTERS API] Запрашиваю список мастеров...');

    try {
        const res = await fetch(url, { credentials: 'include' });

        if (!res.ok) {
            logError('[MASTERS API] Ошибка HTTP:', res.status, res.statusText);
            return [];
        }

        const json = await res.json();

        // Поддерживаем формат { data: [...] } и голый массив
        const list: Master[] = Array.isArray(json)
            ? json
            : Array.isArray(json?.data)
                ? json.data
                : [];

        log(`[MASTERS API] Получено ${list.length} записей`);
        return list;
    } catch (err) {
        logError('[MASTERS API] Ошибка сети:', err);
        return [];
    }
}

/**
 * Элемент каталога (Склад) из CloudShop
 */
export interface RawCatalogItem {
    _id: string;
    type: string; // 'group' | 'inventory'
    name: string;
    _parent?: string;
    id_group?: string;
    code?: string;
    barcode?: string;
    total_stock?: number;
    price?: number;
    [key: string]: any; // fallback
}

/**
 * Загрузка партией (до 1000)
 */
async function fetchCatalogChunk(offset: number): Promise<RawCatalogItem[]> {
    const limit = 1000;
    const url = `${BASE}/proxy/?path=%2Fdata%2F60513087cb4d27a35ac17b13%2Fcatalog&api=v3&limit=${limit}&offset=${offset}&timezone=18000`;

    log(`[CATALOG API] Запрашиваю ${limit} записей со смещением ${offset}...`);

    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) {
        logError('[CATALOG API] Ошибка HTTP:', res.status, res.statusText);
        return [];
    }

    const json = await res.json();
    return Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : []);
}

/**
 * Цикличная загрузка всего каталога CloudShop
 */
export async function fetchAllCatalog(onProgress?: (offset: number) => void): Promise<RawCatalogItem[]> {
    log('[CATALOG API] Начинаю полную загрузку каталога...');

    let allItems: RawCatalogItem[] = [];
    let offset = 0;
    let hasMore = true;
    const uniqueMap = new Map<string, RawCatalogItem>();
    const allSeenIds = new Set<string>();

    try {
        while (hasMore) {
            if (onProgress) onProgress(offset);

            const chunk = await fetchCatalogChunk(offset);

            const previousSize = uniqueMap.size;

            let allAlreadySeen = true;

            for (const item of chunk) {
                if (item._id && !allSeenIds.has(item._id)) {
                    allAlreadySeen = false;
                    allSeenIds.add(item._id);
                }

                if (item.deleted === true || String(item.deleted) === 'true') continue;
                if (item._id) {
                    uniqueMap.set(item._id, item);
                }
            }

            log(`[CATALOG API] Смещение ${offset}, уникальных записей: ${uniqueMap.size}`);

            // 1. Защита от бесконечного цикла (если все ID в чанке нами уже обрабатывались)
            if (chunk.length > 0 && allAlreadySeen) {
                log('[CATALOG API] В чанке нет ни одного нового ID (даже удаленного). Остановка (Infinite Loop).');
                break;
            }

            // 2. Стандартная остановка по концу списка
            if (chunk.length < 1000) {
                hasMore = false;
            } else {
                offset += 1000;
            }
        }
        log(`[CATALOG API] Успешно загружен весь каталог (${uniqueMap.size} уникальных элементов).`);
    } catch (err) {
        logError('[CATALOG API] Ошибка сети при полной загрузке:', err);
    }

    return Array.from(uniqueMap.values());
}
