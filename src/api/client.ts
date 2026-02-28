/* ─── API-клиент для CloudShop (Axios) ─── */

import axios from 'axios';
import { log, logError } from '../utils/logger';
import { toast } from 'sonner';

const IS_GITHUB_PAGES = typeof window !== 'undefined' && window.location.hostname.endsWith('.github.io');
const PROXY = 'https://cors-anywhere.herokuapp.com/';
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://web.cloudshop.ru';

const apiBase = IS_GITHUB_PAGES ? `${PROXY}${BASE_URL}` : '/api-cs';

export const apiClient = axios.create({
    baseURL: apiBase,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

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
 */
export async function login(email: string, password: string) {
    log('[AUTH API] Начинаю запрос авторизации...', { email });

    try {
        const res = await apiClient.post('/auth', { login: email, password });
        log('[AUTH API] Ответ получен:', res.status, res.statusText);
        return res;
    } catch (err: any) {
        logError('[AUTH API] Ошибка:', err);
        // Сохраняем совместимость с fetch Response по полю ok/status
        if (err.response) return err.response;
        toast.error('Сервер авторизации недоступен. Проверьте подключение или используйте Демо-вход.');
        throw err;
    }
}

/**
 * Список поставщиков (мастеров).
 */
export async function fetchMasters(): Promise<Master[]> {
    const path = `/proxy/?path=%2Fdata%2F60513087cb4d27a35ac17b13%2Fsuppliers&api=v3&timezone=18000`;
    log('[MASTERS API] Запрашиваю список мастеров...');

    try {
        const res = await apiClient.get(path);
        const json = res.data;

        const list: Master[] = Array.isArray(json)
            ? json
            : Array.isArray(json?.data)
                ? json.data
                : [];

        log(`[MASTERS API] Получено ${list.length} записей`);
        return list;
    } catch (err) {
        logError('[MASTERS API] Ошибка:', err);
        toast.error('Не удалось загрузить список мастеров. Возможно, прокси-сервер недоступен.');
        return [];
    }
}

/**
 * Элемент каталога (Склад)
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
    [key: string]: any;
}

/**
 * Загрузка партией (до 1000)
 */
async function fetchCatalogChunk(offset: number): Promise<RawCatalogItem[]> {
    const limit = 1000;
    const path = `/proxy/?path=%2Fdata%2F60513087cb4d27a35ac17b13%2Fcatalog&api=v3&limit=${limit}&offset=${offset}&timezone=18000`;

    log(`[CATALOG API] Запрашиваю ${limit} записей со смещением ${offset}...`);

    try {
        const res = await apiClient.get(path);
        const json = res.data;
        return Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : []);
    } catch (err) {
        logError('[CATALOG API] Ошибка HTTP:', err);
        return [];
    }
}

/**
 * Цикличная загрузка всего каталога
 */
export async function fetchAllCatalog(onProgress?: (offset: number) => void): Promise<RawCatalogItem[]> {
    log('[CATALOG API] Начинаю полную загрузку каталога...');

    let offset = 0;
    let hasMore = true;
    const uniqueMap = new Map<string, RawCatalogItem>();
    const allSeenIds = new Set<string>();

    try {
        while (hasMore) {
            if (onProgress) onProgress(offset);

            const chunk = await fetchCatalogChunk(offset);
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

            if (chunk.length > 0 && allAlreadySeen) {
                log('[CATALOG API] В чанке нет ни одного нового ID. Остановка.');
                break;
            }

            if (chunk.length < 1000) {
                hasMore = false;
            } else {
                offset += 1000;
            }
        }
        log(`[CATALOG API] Успешно загружен весь каталог (${uniqueMap.size} уникальных элементов).`);
    } catch (err) {
        logError('[CATALOG API] Ошибка при полной загрузке:', err);
        toast.error('Ошибка при загрузке каталога. Данные могут быть неполными.');
    }

    return Array.from(uniqueMap.values());
}
