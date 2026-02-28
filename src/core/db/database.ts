import Dexie, { type Table } from 'dexie';
import { type Master } from '../../api/client';
import { type WarehouseItem } from '../../utils/parseCatalog';

export class PolkaDB extends Dexie {
    masters!: Table<Master, string>;
    catalog!: Table<WarehouseItem, string>;

    constructor() {
        super('PolkaDB_Final');

        // v1: Начальная схема (миграция с PolkaDB_v3)
        this.version(1).stores({
            masters: '_id, name',
            catalog: '_id, parentId, name, article'
        });

        // v2: Добавлен индекс isFolder для быстрых запросов по папкам
        this.version(2).stores({
            masters: '_id, name',
            catalog: '_id, parentId, name, article, isFolder'
        }).upgrade(tx => {
            // При смене версии данные корректно сохраняются —
            // Dexie автоматически добавит новый индекс.
            // Если нужна трансформация данных, она выполняется здесь.
            console.log('[DB] Миграция v1 → v2: добавлен индекс isFolder');
        });

        // Будущие миграции добавляются здесь:
        // this.version(3).stores({...}).upgrade(tx => {...});
    }
}

export const db = new PolkaDB();
