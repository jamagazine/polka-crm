import Dexie, { type Table } from 'dexie';
import { type Master } from '../../api/client';
import { type WarehouseItem } from '../../utils/parseCatalog';

export class PolkaDB extends Dexie {
    masters!: Table<Master, string>;
    catalog!: Table<WarehouseItem, string>;

    constructor() {
        super('PolkaDB');

        // Определяем схемы таблиц (индексируемые поля)
        this.version(1).stores({
            masters: '_id, name', // _id как PK для мастеров
            catalog: '_id, parentId, name, article' // _id как PK для товаров
        });
    }
}

export const db = new PolkaDB();
