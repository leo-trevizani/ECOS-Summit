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

const AppContent: React.FC = () => {
  const { currentPath } = useApp();

  const renderScreen = () => {
    switch (currentPath) {
      case 'welcome':
        return <WelcomeScreen />;
      case 'onboarding':
        return <OnboardingScreen />;
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

  return renderScreen();
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

