import { useEffect } from 'react';
import { Toaster } from 'sonner';
import { LeftPanel } from './components/polka/LeftPanel';
import { RightPanel } from './components/polka/RightPanel';
import { WorkArea } from './components/polka/WorkArea';
import { LoginPage } from './modules/auth/LoginPage';
import { usePanelStore } from './core/store';
import { useBreakpoint } from './utils/useBreakpoint';
import { MOBILE_BREAKPOINT } from './core/config';

export default function App() {
  const { navCollapsed, contextCollapsed, isAuthenticated, collapseContext } = usePanelStore();
  const isMobile = useBreakpoint(MOBILE_BREAKPOINT);

  // Адаптивная логика: если экран стал узким и обе панели открыты — закрываем правую
  useEffect(() => {
    if (isMobile && !navCollapsed && !contextCollapsed) {
      collapseContext();
    }
  }, [isMobile, navCollapsed, contextCollapsed, collapseContext]);

  // Если не авторизован — показываем только LoginPage
  if (!isAuthenticated) {
    return (
      <>
        <LoginPage />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  return (
    <>
      <Toaster position="top-right" richColors />
      <div
        className={`flex h-screen overflow-hidden ${navCollapsed ? 'nav-collapsed' : ''} ${contextCollapsed ? 'context-collapsed' : ''
          }`}
      >
        <LeftPanel />
        <WorkArea />
        <RightPanel />
      </div>
    </>
  );
}
