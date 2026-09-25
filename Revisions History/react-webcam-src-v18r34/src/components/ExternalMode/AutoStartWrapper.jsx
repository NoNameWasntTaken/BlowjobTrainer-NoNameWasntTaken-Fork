import React from 'react';
import { externalIntegrationService } from '../../services/externalIntegrationService';

/**
 * Wrapper for CLI --auto-start mode (minimal chrome).
 * Navigation is hidden by App.js; this component documents the mode and may grow UI tweaks later.
 * Requires --skip-calibration (enforced in Electron CLI validation).
 */
function AutoStartWrapper({ children }) {
    const isAutoStart = externalIntegrationService.isAutoStartMode();

    if (!isAutoStart) {
        return <>{children}</>;
    }

    return <>{children}</>;
}

export default AutoStartWrapper;
