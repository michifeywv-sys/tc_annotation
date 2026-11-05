import React, { useState, useEffect } from 'react';
import { ProjectSightService } from '../../../services/ProjectSightService';
import { getSavedPSProject, getPsPortfolioId, getPsProjectId, getPsTemplateId } from '../utils/psStorage';

export const LineItemUdfTestPanel: React.FC = () => {
  const [portfolioId, setPortfolioId] = useState(getPsPortfolioId() || '');
  const [projectId, setProjectId] = useState(getPsProjectId() || '');
  const [templateId, setTemplateId] = useState(getPsTemplateId() || '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<any | null>(null);

  // Sync with psStorage / Setup Panel selection
  useEffect(() => {
    const syncWithStorage = () => {
      const saved = getSavedPSProject();
      if (saved.portfolioId) setPortfolioId(saved.portfolioId);
      if (saved.projectId) setProjectId(saved.projectId);
      if (saved.templateId) setTemplateId(saved.templateId);
    };

    syncWithStorage();

    const handleChanged = () => syncWithStorage();
    window.addEventListener('ps-project-changed', handleChanged);
    return () => window.removeEventListener('ps-project-changed', handleChanged);
  }, []);

  const handleRunTest = async () => {
    const curPortId = portfolioId || getPsPortfolioId();
    const curProjId = projectId || getPsProjectId();
    const curTempId = templateId || getPsTemplateId();

    if (!curPortId || !curProjId) {
      setError('Bitte wähle zuerst ein Portfolio und ein Projekt oben im Setup-Panel oder trage die IDs ein.');
      return;
    }

    setLoading(true);
    setError(null);
    setTestResults(null);

    try {
      const data = await ProjectSightService.testLineItemUdfs(curPortId, curProjId, curTempId || undefined);
      setTestResults(data);
    } catch (err: any) {
      if (err.message === 'NOT_LOGGED_IN') {
        setError('Nicht eingeloggt. Bitte melde dich zuerst bei Trimble/ProjectSight an.');
      } else {
        setError(err.message || 'Fehler beim Ausführen des UDF-Tests');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFetchFullChecklists = async () => {
    const curPortId = portfolioId || getPsPortfolioId();
    const curProjId = projectId || getPsProjectId();

    if (!curPortId || !curProjId) {
      setError('Bitte wähle zuerst ein Portfolio und ein Projekt oben im Setup-Panel.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await ProjectSightService.getChecklistsFull(curPortId, curProjId);
      setTestResults({
        title: `GET /${curPortId}/${curProjId}/checklists`,
        success: true,
        fullChecklistsHierarchy: data
      });
    } catch (err: any) {
      if (err.message === 'NOT_LOGGED_IN') {
        setError('Nicht eingeloggt. Bitte melde dich zuerst bei Trimble/ProjectSight an.');
      } else {
        setError(err.message || 'Fehler beim Abrufen der Checklisten-Hierarchie');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '16px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>🧪</span> Test-Labor: Checklist Template Line Item UDFs
      </h3>

      <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 14px 0', lineHeight: '1.4' }}>
        Dieser Test ruft nacheinander mehrere ProjectSight API Endpunkte ab, um Zeilen-Item UDFs (Checklist Task/Row Custom Fields) und Vorlagen-Strukturen zu untersuchen.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '14px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
            Portfolio ID
          </label>
          <input
            type="text"
            value={portfolioId}
            onChange={(e) => setPortfolioId(e.target.value)}
            placeholder="z.B. Portfolio GUID"
            style={{ width: '100%', padding: '7px 10px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
            Project ID
          </label>
          <input
            type="text"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            placeholder="z.B. Projekt ID"
            style={{ width: '100%', padding: '7px 10px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
            Template ID (Optional)
          </label>
          <input
            type="text"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            placeholder="z.B. Vorlage ID"
            style={{ width: '100%', padding: '7px 10px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          onClick={handleRunTest}
          disabled={loading}
          style={{
            width: '100%',
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: 'bold',
            color: '#ffffff',
            backgroundColor: loading ? '#94a3b8' : '#0063a3',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s ease'
          }}
        >
          {loading ? '⏳ Teste ProjectSight Endpunkte...' : '🚀 Line Item UDFs Probe-Test ausführen'}
        </button>

        <button
          onClick={handleFetchFullChecklists}
          disabled={loading}
          style={{
            width: '100%',
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: 'bold',
            color: '#ffffff',
            backgroundColor: loading ? '#94a3b8' : '#2e7d32',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s ease'
          }}
        >
          {loading ? '⏳ Lade Checklisten-Hierarchie...' : '📋 GET /{portfolioGuid}/{projectId}/checklists (Volle Hierarchie)'}
        </button>
      </div>


      {error && (
        <div style={{ marginTop: '12px', padding: '10px 12px', backgroundColor: '#fef2f2', borderLeft: '4px solid #ef4444', color: '#991b1b', fontSize: '12px', borderRadius: '4px' }}>
          <strong>Fehler:</strong> {error}
        </div>
      )}

      {testResults && (
        <div style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#1e293b' }}>
            📊 Testergebnisse der API Endpunkte
          </h4>

          {/* Gefundene UDFs */}
          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <strong style={{ fontSize: '13px', color: '#0f172a' }}>
              🎯 Gefilterte Line-Item UDFs (TableType != 0 / TableName item):
            </strong>
            {testResults.detectedLineItemUdfs && testResults.detectedLineItemUdfs.length > 0 ? (
              <div style={{ marginTop: '8px' }}>
                {testResults.detectedLineItemUdfs.map((udf: any, idx: number) => (
                  <div key={idx} style={{ fontSize: '12px', background: '#fff', padding: '6px 10px', borderRadius: '4px', marginBottom: '4px', border: '1px solid #cbd5e1' }}>
                    <strong>{udf.Caption || udf.Name}</strong> (Name: <code>{udf.Name}</code> | Typ: {udf.Type} | TableName: {udf.TableName} | TableType: {udf.TableType})
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                Keine expliziten Zeilen-Item UDFs in <code>/checklists/udfs</code> gefiltert (alle UDFs haben TableType 0 / Header Scope).
              </p>
            )}
          </div>

          {/* Endpunkt Übersicht */}
          <div style={{ marginBottom: '16px' }}>
            <strong style={{ fontSize: '12px', color: '#475569', display: 'block', marginBottom: '8px' }}>
              Geprüfte Endpunkte & HTTP Status:
            </strong>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {Object.entries(testResults.endpointResults || {}).map(([key, res]: [string, any]) => {
                const isOk = res.ok;
                const status = res.status || 'Fehler';
                const itemsCount = Array.isArray(res.data) ? `${res.data.length} Einträge` : (res.data ? 'Objekt empfangen' : 'Keine Daten');
                return (
                  <div
                    key={key}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      fontSize: '12px',
                      borderRadius: '4px',
                      backgroundColor: isOk ? '#f0fdf4' : '#fef2f2',
                      border: `1px solid ${isOk ? '#bbf7d0' : '#fecaca'}`
                    }}
                  >
                    <div>
                      <strong style={{ color: isOk ? '#166534' : '#991b1b' }}>[{key}]</strong> <code>{res.endpoint}</code>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>{itemsCount}</span>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontWeight: 'bold',
                          fontSize: '11px',
                          backgroundColor: isOk ? '#22c55e' : '#ef4444',
                          color: '#fff'
                        }}
                      >
                        HTTP {status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Details JSON View */}
          <details style={{ fontSize: '12px' }}>
            <summary style={{ cursor: 'pointer', color: '#0063a3', fontWeight: 'bold' }}>
              🔍 Vollständiges JSON-Ergebnis anzeigen
            </summary>
            <pre
              style={{
                marginTop: '8px',
                padding: '12px',
                backgroundColor: '#0f172a',
                color: '#38bdf8',
                borderRadius: '6px',
                overflowX: 'auto',
                maxHeight: '350px',
                fontSize: '11px'
              }}
            >
              {JSON.stringify(testResults, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};
