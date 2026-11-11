/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { WelcomeScreen } from './components/WelcomeScreen';
import { OnboardingScreen } from './components/OnboardingScreen';
import { WalletScreen } from './components/WalletScreen';
import { AgencyDashboard } from './components/AgencyDashboard';
import { AdminConsole } from './components/AdminConsole';
import { GamificationScreen } from './components/GamificationScreen';
import { NpsBottomDrawer } from './components/NpsBottomDrawer';
import { hasInteractedWithNps } from './utils/nps';

const AppContent: React.FC = () => {
  const { currentPath } = useApp();
  const [showNpsDrawer, setShowNpsDrawer] = React.useState(false);
  const routeChangesCountRef = React.useRef(0);
  const timerRef = React.useRef<any>(null);

  // Monitor navigation and session to trigger random/recurrent NPS bottom drawer
  React.useEffect(() => {
    // If user has already clicked / responded to NPS, do not trigger
    if (hasInteractedWithNps()) {
      setShowNpsDrawer(false);
      return;
    }

    // Do not trigger on admin or agency dashboard to avoid interrupting organizers
    if (currentPath === 'admin' || currentPath === 'admin-secret-ranking' || currentPath === 'agencia') {
      return;
    }

    routeChangesCountRef.current += 1;

    // Trigger on 3rd route transition or with a gentle delayed probability
    if (routeChangesCountRef.current >= 3) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (!hasInteractedWithNps()) {
          setShowNpsDrawer(true);
        }
      }, 1500);
    } else {
      // Gentle delayed timer on first visit/navigation (e.g. 25 seconds)
      if (!timerRef.current) {
        timerRef.current = setTimeout(() => {
          if (!hasInteractedWithNps()) {
            setShowNpsDrawer(true);
          }
        }, 25000);
      }
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentPath]);

  const renderScreen = () => {
    switch (currentPath) {
      case 'welcome':
        return <WelcomeScreen />;
      case 'onboarding':
        return <OnboardingScreen />;
      case 'gamificacao':
      case 'como-funciona':
        return <GamificationScreen />;
      case 'wallet':
      case 'investir':
        return <WalletScreen />;
      case 'agencia':
        return <AgencyDashboard />;
      case 'admin':
      case 'admin-secret-ranking':
        return <AdminConsole />;
      default:
        return <WelcomeScreen />;
    }
  };

  return (
    <>
      {renderScreen()}
      <NpsBottomDrawer
        isOpen={showNpsDrawer}
        onClose={() => setShowNpsDrawer(false)}
      />
    </>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

