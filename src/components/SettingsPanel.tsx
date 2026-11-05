import React, { useState, useEffect } from 'react';
import { ModusButton, ModusCard } from './ui/NativeModusComponents';
import { TrimbleConnectService } from '../services/TrimbleConnectService';

export const SettingsPanel: React.FC = () => {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await TrimbleConnectService.getSettings();
      setSettings(data || { theme: 'Light', extensionEnabled: true });
    } catch (e) {
      console.warn('Could not fetch settings from Trimble Connect core, using defaults', e);
      setSettings({ theme: 'Light', extensionEnabled: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h3>Core Settings</h3>
      {loading ? (
        <p>Loading settings...</p>
      ) : settings ? (
        <ModusCard style={{ padding: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <strong>Theme: </strong>
              <span>{settings.theme}</span>
            </div>
            <div>
              <strong>Extension Status: </strong>
              <span>{settings.extensionEnabled ? 'Enabled' : 'Disabled'}</span>
            </div>
            <ModusButton buttonStyle="secondary" onClick={fetchSettings}>
              Reload Settings
            </ModusButton>
          </div>
        </ModusCard>
      ) : null}
    </div>
  );
};
