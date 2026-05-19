import React from 'react';
import { externalIntegrationService } from '../../services/externalIntegrationService';

/**
 * Headless Mode Wrapper
 * Hides navigation and shows minimal UI when headless mode is active
 * Note: Headless mode should only be used with --skip-calibration enabled
 */
function HeadlessWrapper({ children }) {
    const isHeadless = externalIntegrationService.isHeadlessMode();
    
    if (!isHeadless) {
        return <>{children}</>;
    }

    // In headless mode, just render children without navigation
    // Navigation component will be hidden by App.js
    return <>{children}</>;
}

export default HeadlessWrapper;
