import React, { useEffect, useState } from 'react';
import type { WorkspaceAPI } from 'trimble-connect-workspace-api';
import { ModusCard, ModusButton, ModusAlert } from '../../components/ui/NativeModusComponents';

// Wir definieren ein Interface für die Props der Komponente
interface DashboardProps {
  api: WorkspaceAPI;
}

export function DashboardApp({ api }: DashboardProps) {
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    const mainMenuObject = {
      title: "DACH API Demo",
      icon: "https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg",
      command: "main_nav_menu_clicked",
      subMenus: [
        {
          title: "Startseite",
          icon: "https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg",
          command: "submenu_1_clicked",
        }
      ]
    };

    // Dank des richtigen Typs erkennt VS Code jetzt api.ui.setMenu automatisch!
    if (api && api.ui) {
      console.log("Sende Menü an Trimble...", api.ui);
      api.ui.setMenu(mainMenuObject);
    } else {
      console.warn("DashboardApp: api.ui is not available", api);
    }
  }, [api]);

  const handleTestKnopf = async () => {
    try {
      // Hier nutzen wir die Methode aus der Doku
      const projectInfo = await api.project.getProject();
      setFeedbackMessage(`Verbunden mit: ${projectInfo.name}`);
    } catch (error) {
      setFeedbackMessage("Fehler: API nicht erreichbar.");
    }
  };

  return (
    <ModusCard>
      <div style={{ padding: '20px' }}>
        <h2 style={{ marginTop: 0, color: '#0063a3' }}>Projekt Dashboard Tool</h2>
        <ModusButton color="primary" onClick={handleTestKnopf}>
          Projekt-Daten abrufen
        </ModusButton>
        {feedbackMessage && (
          <div style={{ marginTop: '16px' }}>
            <ModusAlert type="info" message={feedbackMessage} />
          </div>
        )}
      </div>
    </ModusCard>
  );
}