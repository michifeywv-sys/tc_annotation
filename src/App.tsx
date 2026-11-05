import { useEffect, useState } from 'react';
import { connect } from 'trimble-connect-workspace-api';
import type { WorkspaceAPI } from 'trimble-connect-workspace-api';

import { Layout } from './components/Layout';
import { DashboardApp } from './features/dashboard/DashboardApp';
import { ViewerApp } from './features/viewer/ViewerApp';
import { MarkupPopoverApp } from './features/viewer/MarkupPopoverApp';
import { ChecklistPopoverApp } from './features/viewer/ChecklistPopoverApp';

function createMockApi(): WorkspaceAPI {
  return {
    viewer: {
      getSelection: async () => [],
      getLoadedModels: async () => [],
      getModels: async () => [],
      convertToObjectIds: async () => [],
      getObjectProperties: async () => [],
      on: () => {},
      off: () => {}
    },
    project: {
      getProject: async () => ({ id: 'standalone-project', name: 'Standalone / Fallback Mode' })
    },
    ui: {
      setMenu: () => {}
    },
    extension: {
      configure: async () => {},
      getPermission: async () => null,
      requestPermission: async () => null
    }
  } as unknown as WorkspaceAPI;
}

export function App() {
  const [context, setContext] = useState<'viewer' | 'project' | null>(null);
  const [api, setApi] = useState<WorkspaceAPI | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initApp = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const mode = urlParams.get('mode');
      const inIframe = window.self !== window.top;

      if (!inIframe) {
        console.warn('Trimble Connect: Standalone Modus (Kein iFrame)');
        if (isMounted) {
          setApi(createMockApi());
          setIsStandalone(true);
          setContext(mode === 'dashboard' ? 'project' : 'viewer');
        }
        return;
      }

      try {
        const connectPromise = connect(
          window.parent,
          (event, args) => {
            console.log('Trimble Event:', event, args);
            window.dispatchEvent(new CustomEvent('trimble-event', { detail: { event, args } }));
          },
          5000
        );

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Handshake Timeout')), 4000)
        );

        const tcApi = await Promise.race([connectPromise, timeoutPromise]);

        if (isMounted) {
          console.log('✅ Workspace API erfolgreich verbunden');
          setApi(tcApi as WorkspaceAPI);

          if (tcApi && (tcApi as any).extension) {
            try {
              const ext = (tcApi as any).extension;
              const token = await (ext.requestPermission ? ext.requestPermission('accesstoken') : ext.getPermission('accesstoken'));
              if (token) {
                console.log('🔑 Token via Trimble Extension erlangt');
                await fetch('/api/token', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ token })
                });
              }
            } catch (tokenErr) {
              console.warn('Trimble Connect: Token Permission nicht erteilt:', tokenErr);
            }
          }

          setContext(mode === 'dashboard' ? 'project' : 'viewer');
        }
      } catch (err: any) {
        console.warn('Trimble Connect: Handshake Fallback aktiviert:', err.message);
        if (isMounted) {
          setApi(createMockApi());
          setIsStandalone(true);
          setContext(mode === 'dashboard' ? 'project' : 'viewer');
        }
      }
    };

    initApp();

    return () => {
      isMounted = false;
    };
  }, []);

  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode');
  const activeApi = api || createMockApi();

  if (context === null) {
    return (
      <div style={{ padding: '30px', textAlign: 'center', fontFamily: 'Segoe UI, sans-serif' }}>
        <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
        <div style={{ fontWeight: 'bold', color: '#0063a3', fontSize: '15px' }}>
          Verbindung mit Trimble Connect wird hergestellt...
        </div>
        <p style={{ fontSize: '12px', color: '#666', marginTop: '6px' }}>Bitte kurz gedulden.</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', minHeight: '100vh', backgroundColor: '#ffffff', color: '#333333' }}>
      {isStandalone && mode !== 'popover' && mode !== 'checklist-popover' && (
        <div style={{ padding: '10px 16px', backgroundColor: '#eef7ff', borderBottom: '1px solid #b3d4fc', fontSize: '12px', color: '#005288', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>ℹ️</span> Standalone / Vorschau-Modus aktiv (Trimble API bereitgestellt).
        </div>
      )}

      {mode === 'popover' && (
        <MarkupPopoverApp api={activeApi} />
      )}
      {mode === 'checklist-popover' && (
        <ChecklistPopoverApp api={activeApi} />
      )}

      {context === 'viewer' && mode !== 'popover' && mode !== 'checklist-popover' && (
        <ViewerApp api={activeApi} />
      )}

      {context === 'project' && (
        <Layout>
          <DashboardApp api={activeApi} />
        </Layout>
      )}
    </div>
  );
}

export default App;