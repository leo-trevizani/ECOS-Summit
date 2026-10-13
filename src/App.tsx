/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { WelcomeScreen } from './components/WelcomeScreen';
import { OnboardingScreen } from './components/OnboardingScreen';
import { WalletScreen } from './components/WalletScreen';
import { AgencyDashboard } from './components/AgencyDashboard';
import { AdminConsole } from './components/AdminConsole';
import { GpsPermissionBarrier } from './components/GpsPermissionBarrier';
import { checkGeolocationPermission } from './utils/geolocation';

const AppContent: React.FC = () => {
  const { currentPath, geofenceConfig } = useApp();
  const [hasGpsPermission, setHasGpsPermission] = useState<boolean | null>(null);

  const isParticipantPath = ['welcome', 'onboarding', 'wallet', 'investir'].includes(currentPath);

  // Check initial permission status if geofence is enabled
  useEffect(() => {
    if (!geofenceConfig?.enabled) {
      setHasGpsPermission(true);
      return;
    }

    checkGeolocationPermission().then((perm) => {
      if (perm === 'granted') {
        setHasGpsPermission(true);
      } else {
        setHasGpsPermission(false);
      }
    });
  }, [geofenceConfig?.enabled]);

  // If geofencing is enabled and this is a participant screen, enforce GPS permission
  if (geofenceConfig?.enabled && isParticipantPath && hasGpsPermission === false) {
    return <GpsPermissionBarrier onPermissionGranted={() => setHasGpsPermission(true)} />;
  }

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

