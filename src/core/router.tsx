import { Routes, Route } from 'react-router';
import { Home, Users, Package, FileText, Terminal, type LucideIcon } from 'lucide-react';
import { MastersPage } from '../modules/masters/MastersPage';
import { WarehousePage } from '../modules/warehouse/WarehousePage';
import { usePanelStore } from './store';

/* ─── Секции (разделы) ─── */

export type SectionId = 'main' | 'docs' | 'logs';

export interface SectionEntry {
    id: SectionId;
    label: string;
    icon: LucideIcon;
}

export const sectionRegistry: SectionEntry[] = [
    { id: 'main', label: 'Главная', icon: Home },
    { id: 'docs', label: 'Документы', icon: FileText },
    { id: 'logs', label: 'Логи', icon: Terminal },
];

/* ─── Модули ─── */

export interface ModuleEntry {
    path: string;
    label: string;
    icon: LucideIcon;
    section: SectionId;
}

export const moduleRegistry: ModuleEntry[] = [
    { path: '/masters', label: 'Мастера', icon: Users, section: 'main' },
    { path: '/warehouse', label: 'Склад', icon: Package, section: 'main' },
];

/** Получить модули для конкретной секции */
export function getModulesBySection(section: SectionId): ModuleEntry[] {
    return moduleRegistry.filter((m) => m.section === section);
}

/* ─── Заглушка ─── */

function Placeholder({ name }: { name: string }) {
    return (
        <div className="flex-1 flex flex-col p-6 items-center justify-center h-full text-gray-400">
            <span>Модуль «{name}» — в разработке</span>
        </div>
    );
}


/* ─── Маршруты ─── */

export function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<Placeholder name="Главная" />} />
            <Route path="/masters" element={<MastersPage />} />
            <Route path="/masters/:id" element={<Placeholder name="Мастер" />} />
            <Route path="/warehouse" element={<WarehousePage />} />
            <Route path="*" element={<Placeholder name="404" />} />
        </Routes>
    );
}
