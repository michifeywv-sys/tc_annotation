import React, { useEffect, useState } from 'react';
import { ModusCard, ModusButton, ModusAlert } from './ui/NativeModusComponents';
import { TrimbleConnectService } from '../services/TrimbleConnectService';

export const DashboardPanel: React.FC = () => {
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    const mainMenuObject = {
      title: 'DACH API Demo',
      icon: 'https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg',
      command: 'main_nav_menu_clicked',
      subMenus: [
        {
          title: 'Startseite',
          icon: 'https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg',
          command: 'submenu_1_clicked',
        },
      ],
    };

    try {
      console.log('Sending menu to Trimble Connect...');
      TrimbleConnectService.setMenu(mainMenuObject);
    } catch (error) {
      console.warn('Could not set custom menu', error);
    }
  }, []);

  const handleFetchProjectData = async () => {
    try {
      const projectInfo = await TrimbleConnectService.getProject();
      setFeedbackMessage(`Connected to project: ${projectInfo.name}`);
    } catch (error) {
      setFeedbackMessage('Error: Connected API not reachable.');
    }
  };

  return (
    <div style={{ padding: '16px' }}>
      <ModusCard>
        <div style={{ padding: '20px' }}>
          <h2 style={{ marginTop: 0, color: '#0063a3' }}>Projekt Dashboard Tool</h2>
          <p style={{ marginBottom: '16px', color: '#555' }}>
            Fetch details for the currently active project and set custom workspace navigations.
          </p>
          <ModusButton color="primary" onClick={handleFetchProjectData}>
            Retrieve Project Data
          </ModusButton>
          {feedbackMessage && (
            <div style={{ marginTop: '16px' }}>
              <ModusAlert type="info" message={feedbackMessage} />
            </div>
          )}
        </div>
      </ModusCard>
    </div>
  );
};
