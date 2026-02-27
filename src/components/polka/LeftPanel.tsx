import { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronLeft, User, Settings, LogOut } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';
import { usePanelStore } from '../../core/store';
import { sectionRegistry, getModulesBySection } from '../../core/router';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import { useBreakpoint } from '../../utils/useBreakpoint';
import { CSS } from '../../utils/cssVars';
import { MOBILE_BREAKPOINT } from '../../core/config';

export function LeftPanel() {
  const {
    navCollapsed, toggleNav, activeSection, setActiveSection,
    isAuthenticated, userEmail, logout,
  } = usePanelStore();
  const isCollapsed = navCollapsed;
  const isMobile = useBreakpoint(MOBILE_BREAKPOINT);
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Модули текущей секции
  const sectionModules = getModulesBySection(activeSection);

  /* Текст тултипа зависит от статуса */
  const statusTooltip = isAuthenticated ? 'Подключено к CloudShop' : 'Не авторизован';

  /* Клик вне панели — закрыть */
  useEffect(() => {
    if (!profileOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [profileOpen]);

  /* Закрываем профиль при смене состояния панели */
  useEffect(() => {
    setProfileOpen(false);
  }, [isCollapsed]);

  /* Содержимое панели профиля */
  const profilePanelContent = (
    <div className="flex flex-col">
      {/* Строка 1: Профиль + email — 60px */}
      <div className="h-[60px] flex flex-col justify-center px-4 border-b" style={{ borderColor: CSS.border }}>
        <p className="text-sm font-medium text-foreground leading-tight">Профиль</p>
        <p className="text-xs text-muted-foreground truncate">{userEmail || 'Не авторизован'}</p>
      </div>
      {/* Строка 2: Статус подключения — 60px */}
      <div className="h-[60px] flex items-center gap-2 px-4 border-b text-xs text-muted-foreground" style={{ borderColor: CSS.border }}>
        <span className={`w-2.5 h-2.5 rounded-full ${isAuthenticated ? 'bg-green-500' : 'bg-gray-400'}`} />
        {isAuthenticated ? 'Подключено к CloudShop' : 'Нет подключения'}
      </div>
      {/* Строка 3: Выйти — 60px */}
      <button
        onClick={() => { logout(); setProfileOpen(false); }}
        className="h-[60px] w-full flex items-center gap-2 px-4 text-sm
                   hover:bg-destructive/10 text-destructive transition-colors"
      >
        <LogOut className="w-4 h-4" />
        Выйти
      </button>
    </div>
  );

  return (
    <aside
      className={`relative z-40 flex flex-col border-r transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-[280px]'
        }`}
      style={{ borderColor: CSS.border }}
      ref={panelRef}
    >
      {/* Header - 60px */}
      <header className="h-[60px] border-b flex items-center" style={{ borderColor: CSS.border }}>
        {!isCollapsed ? (
          <div className="grid grid-cols-5 gap-0 w-full h-full">
            <button
              onClick={() => toggleNav(isMobile)}
              className="flex items-center justify-center hover:bg-gray-100 transition-colors border-r"
              style={{ borderColor: CSS.border }}
              title="Свернуть"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            {sectionRegistry.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id)}
                  className={`flex items-center justify-center transition-colors border-r ${isActive ? 'bg-gray-100' : 'hover:bg-gray-100'
                    }`}
                  style={{ borderColor: CSS.border }}
                  title={sec.label}
                >
                  <Icon className="w-5 h-5" />
                </button>
              );
            })}
            <div className="border-r-0" />
          </div>
        ) : (
          <button
            onClick={() => toggleNav(isMobile)}
            className="w-full h-full flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </header>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto" style={{ backgroundColor: CSS.bgLight }}>
        {isCollapsed ? (
          <div className="flex flex-col gap-1 p-2">
            {sectionRegistry.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id)}
                  className={`w-full h-10 flex items-center justify-center rounded transition-colors ${isActive ? 'bg-gray-200' : 'hover:bg-gray-200'
                    }`}
                  title={sec.label}
                >
                  <Icon className="w-5 h-5" />
                </button>
              );
            })}
            {sectionModules.length > 0 && (
              <div className="border-t my-1" style={{ borderColor: CSS.border }} />
            )}
            {sectionModules.map((mod) => {
              const Icon = mod.icon;
              const isActive =
                location.pathname === mod.path ||
                location.pathname.startsWith(mod.path);
              return (
                <button
                  key={mod.path}
                  onClick={() => navigate(mod.path)}
                  className={`w-full h-10 flex items-center justify-center rounded transition-colors ${isActive ? 'bg-gray-200' : 'hover:bg-gray-200'
                    }`}
                  title={mod.label}
                >
                  <Icon className="w-5 h-5" />
                </button>
              );
            })}
          </div>
        ) : (
          <nav className="flex flex-col gap-1 p-2">
            {sectionModules.length > 0 ? (
              sectionModules.map((mod) => {
                const Icon = mod.icon;
                const isActive =
                  location.pathname === mod.path ||
                  (mod.path !== '/' && location.pathname.startsWith(mod.path));
                return (
                  <button
                    key={mod.path}
                    onClick={() => navigate(mod.path)}
                    className={`w-full h-10 flex items-center gap-3 px-3 rounded transition-colors text-sm ${isActive ? 'bg-gray-200 font-medium' : 'hover:bg-gray-100'
                      }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span>{mod.label}</span>
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-4 text-sm text-gray-400">
                Модули раздела пока не добавлены
              </div>
            )}
          </nav>
        )}
      </div>

      {/* ═══ Выезжающая панель профиля ═══ */}
      {!isCollapsed ? (
        /* Развёрнуто: поднимается вверх из-под подвала, на всю ширину панели */
        <div
          className={`absolute bottom-[60px] left-0 w-full bg-popover border-t border-r shadow-lg
                      transition-all duration-200 ease-out origin-bottom overflow-hidden
                      ${profileOpen
              ? 'opacity-100 scale-y-100 translate-y-0'
              : 'opacity-0 scale-y-95 translate-y-2 pointer-events-none'
            }`}
          style={{ borderColor: CSS.border }}
        >
          {profilePanelContent}
        </div>
      ) : (
        /* Свёрнуто: вылетает вправо от панели, поверх центральной зоны */
        <div
          className={`absolute bottom-0 left-full h-[180px] w-56 bg-popover border shadow-lg rounded-r-md
                      transition-all duration-200 ease-out origin-left overflow-hidden
                      ${profileOpen
              ? 'opacity-100 scale-x-100 translate-x-0'
              : 'opacity-0 scale-x-95 -translate-x-2 pointer-events-none'
            }`}
          style={{ borderColor: CSS.border }}
        >
          {profilePanelContent}
        </div>
      )}

      {/* Footer */}
      <footer
        className={`border-t flex transition-all duration-300 ${isCollapsed ? 'h-[180px] flex-col' : 'h-[60px] flex-row'
          }`}
        style={{ borderColor: CSS.border }}
      >
        {!isCollapsed ? (
          <>
            <div className="flex-1 flex items-center justify-center px-4">
              <span className="font-extrabold text-xl">ПОЛКА</span>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setProfileOpen((v) => !v)}
                  className={`relative w-[60px] h-full flex items-center justify-center transition-colors border-l ${profileOpen ? 'bg-gray-200' : 'hover:bg-gray-100'
                    }`}
                  style={{ borderColor: CSS.border }}
                >
                  <User className="w-5 h-5" />
                  <span
                    className={`absolute top-3 right-3 w-3 h-3 rounded-full shadow-sm border-2 border-background ${isAuthenticated ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">{statusTooltip}</TooltipContent>
            </Tooltip>
            <button
              className="w-[60px] h-full flex items-center justify-center hover:bg-gray-100 transition-colors border-l"
              style={{ borderColor: CSS.border }}
              title="Настройки"
            >
              <Settings className="w-5 h-5" />
            </button>
          </>
        ) : (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setProfileOpen((v) => !v)}
                  className={`relative flex-1 flex items-center justify-center transition-colors border-b ${profileOpen ? 'bg-gray-200' : 'hover:bg-gray-100'
                    }`}
                  style={{ borderColor: CSS.border }}
                >
                  <User className="w-5 h-5" />
                  <span
                    className={`absolute top-3 right-3 w-3 h-3 rounded-full shadow-sm border-2 border-background ${isAuthenticated ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{statusTooltip}</TooltipContent>
            </Tooltip>
            <button
              className="flex-1 flex items-center justify-center hover:bg-gray-100 transition-colors border-b"
              style={{ borderColor: CSS.border }}
              title="Настройки"
            >
              <Settings className="w-5 h-5" />
            </button>
            <div className="flex-1 flex items-center justify-center">
              <span className="font-extrabold text-xl">П</span>
            </div>
          </>
        )}
      </footer>
    </aside>
  );
}
