import React, { useEffect, useState } from 'react';
import { ModusButton, ModusAlert } from '../../../components/ui/NativeModusComponents';
import { ProjectSightService } from '../../../services/ProjectSightService';
import { getSavedPSProject, savePSProject } from '../utils/psStorage';

interface ProjectSightSetupPanelProps {
  onProjectConfigured?: (config: { portfolioId: string; projectId: string }) => void;
}

export function ProjectSightSetupPanel({ onProjectConfigured }: ProjectSightSetupPanelProps) {
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [workflowStates, setWorkflowStates] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedStateId, setSelectedStateId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const [activeConfig, setActiveConfig] = useState(getSavedPSProject());
  const [isEditing, setIsEditing] = useState<boolean>(!getSavedPSProject().projectId || !getSavedPSProject().templateId);

  const [loadingPortfolios, setLoadingPortfolios] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // 1. Laden aller Portfolios
  useEffect(() => {
    const fetchPortfolios = async () => {
      setLoadingPortfolios(true);
      setFeedback(null);
      try {
        const list = await ProjectSightService.getPortfolios();
        setPortfolios(list);

        const saved = getSavedPSProject();
        if (saved.portfolioId) {
          setSelectedPortfolioId(saved.portfolioId);
        } else if (list.length > 0) {
          setSelectedPortfolioId(list[0].PortfolioID);
        }
      } catch (err: any) {
        console.error('Fehler beim Laden der Portfolios:', err);
        setFeedback({
          type: 'error',
          msg: err.message === 'NOT_LOGGED_IN' 
            ? 'Nicht bei ProjectSight angemeldet. Bitte melde dich zuerst an.' 
            : `Fehler beim Laden der Portfolios: ${err.message}`
        });
      } finally {
        setLoadingPortfolios(false);
      }
    };

    fetchPortfolios();
  }, []);

  // 2. Laden der Projekte beim Portfolio-Wechsel
  useEffect(() => {
    if (!selectedPortfolioId) {
      setProjects([]);
      return;
    }

    const fetchProjects = async () => {
      setLoadingProjects(true);
      try {
        const list = await ProjectSightService.getProjects(selectedPortfolioId);
        setProjects(list);

        const saved = getSavedPSProject();
        if (saved.projectId && saved.portfolioId === selectedPortfolioId) {
          setSelectedProjectId(saved.projectId);
        } else if (list.length > 0) {
          setSelectedProjectId(list[0].ProjectID || list[0].Id);
        } else {
          setSelectedProjectId('');
        }
      } catch (err: any) {
        console.error('Fehler beim Laden der Projekte:', err);
      } finally {
        setLoadingProjects(false);
      }
    };

    fetchProjects();
  }, [selectedPortfolioId]);

  // 3. Laden der Metadaten (Vorlagen, States, User) beim Projekt-Wechsel
  useEffect(() => {
    if (!selectedPortfolioId || !selectedProjectId) {
      setTemplates([]);
      setWorkflowStates([]);
      setUsers([]);
      return;
    }

    const fetchMetadata = async () => {
      setLoadingMetadata(true);
      try {
        const [templatesList, statesList, usersList] = await Promise.all([
          ProjectSightService.getTemplates(selectedPortfolioId, selectedProjectId),
          ProjectSightService.getWorkflowStates(selectedPortfolioId, selectedProjectId),
          ProjectSightService.getUsers(selectedPortfolioId)
        ]);

        setTemplates(templatesList);
        setWorkflowStates(statesList);
        setUsers(usersList);

        const saved = getSavedPSProject();
        if (saved.templateId) {
          setSelectedTemplateId(saved.templateId);
        } else if (templatesList.length > 0) {
          setSelectedTemplateId(templatesList[0].TemplateID || templatesList[0].Id);
        }

        if (saved.stateId) {
          setSelectedStateId(saved.stateId);
        } else if (statesList.length > 0) {
          setSelectedStateId(statesList[0].WorkflowStateID || statesList[0].Id);
        }

        if (saved.userId) {
          setSelectedUserId(saved.userId);
        } else if (usersList.length > 0) {
          setSelectedUserId(usersList[0].ContactID || usersList[0].Id || usersList[0].UserID);
        }
      } catch (err) {
        console.error('Fehler beim Laden der Vorlagen & Metadaten:', err);
      } finally {
        setLoadingMetadata(false);
      }
    };

    fetchMetadata();
  }, [selectedPortfolioId, selectedProjectId]);

  // Event Listener für Änderungen aus anderen Komponenten/Tabs
  useEffect(() => {
    const handleChanged = () => {
      setActiveConfig(getSavedPSProject());
    };
    window.addEventListener('ps-project-changed', handleChanged);
    return () => window.removeEventListener('ps-project-changed', handleChanged);
  }, []);

  const handleSaveConfig = () => {
    if (!selectedPortfolioId || !selectedProjectId || !selectedTemplateId || !selectedStateId || !selectedUserId) {
      setFeedback({ type: 'error', msg: 'Bitte wähle Portfolio, Projekt, Vorlage, Status und Autor aus.' });
      return;
    }

    const pObj = portfolios.find(p => p.PortfolioID === selectedPortfolioId);
    const prjObj = projects.find(p => (p.ProjectID || p.Id) === selectedProjectId);
    const tObj = templates.find(t => (t.TemplateID || t.Id) === selectedTemplateId);

    const pName = pObj ? (pObj.Name || pObj.AccountName || selectedPortfolioId) : selectedPortfolioId;
    const prjName = prjObj ? (prjObj.Name || prjObj.ProjectName || selectedProjectId) : selectedProjectId;
    const tName = tObj ? (tObj.Name || `Vorlage #${selectedTemplateId}`) : selectedTemplateId;

    savePSProject(
      selectedPortfolioId, 
      selectedProjectId, 
      pName, 
      prjName, 
      selectedTemplateId, 
      tName, 
      selectedStateId, 
      selectedUserId
    );

    setActiveConfig(getSavedPSProject());
    setIsEditing(false);
    setFeedback({ type: 'success', msg: `Projekt "${prjName}" & Vorlage "${tName}" für die Session festgelegt!` });

    if (onProjectConfigured) {
      onProjectConfigured({ portfolioId: selectedPortfolioId, projectId: selectedProjectId });
    }
  };

  return (
    <div style={{ backgroundColor: '#e6f2fa', padding: '14px', borderRadius: '6px', border: '1px solid #0063a3', marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '15px', color: '#0063a3', display: 'flex', alignItems: 'center', gap: '6px' }}>
          ⚙️ ProjectSight & Checklisten Setup
        </h3>
        {activeConfig.projectId && (
          <button
            onClick={() => setIsEditing(!isEditing)}
            style={{
              fontSize: '11px',
              padding: '3px 8px',
              cursor: 'pointer',
              borderRadius: '4px',
              border: '1px solid #0063a3',
              backgroundColor: isEditing ? '#0063a3' : '#fff',
              color: isEditing ? '#fff' : '#0063a3'
            }}
          >
            {isEditing ? 'Schließen ✖' : 'Vorlage / Projekt Ändern ✏️'}
          </button>
        )}
      </div>

      {/* ANZEIGE DES AKTIV GEWÄHLTEN PROJEKTS & DER VORLAGE */}
      {!isEditing && activeConfig.projectId && (
        <div style={{ marginTop: '10px', fontSize: '13px', color: '#333', backgroundColor: '#fff', padding: '10px', borderRadius: '4px', border: '1px solid #b3d4fc' }}>
          <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>Ziel-Projekt:</div>
          <div style={{ fontWeight: 'bold', color: '#0063a3', fontSize: '14px', marginTop: '2px' }}>
            {activeConfig.projectName || activeConfig.projectId}
          </div>

          <div style={{ marginTop: '8px', borderTop: '1px solid #eee', paddingTop: '6px' }}>
            <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>Aktive Checklisten-Vorlage:</div>
            <div style={{ fontWeight: 'bold', color: '#2e7d32', fontSize: '13px', marginTop: '2px' }}>
              📋 {activeConfig.templateName || activeConfig.templateId || 'Keine gewählt'}
            </div>
          </div>
        </div>
      )}

      {/* EINSTELLUNGSFORMULAR */}
      {isEditing && (
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {feedback && (
            <div style={{ marginBottom: '4px' }}>
              <ModusAlert type={feedback.type} message={feedback.msg} />
              {(feedback.msg.includes('Nicht bei ProjectSight angemeldet') || feedback.msg.includes('NOT_LOGGED_IN')) && (
                <div style={{ marginTop: '10px' }}>
                  <a
                    href="http://localhost:3000/login"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-block',
                      padding: '8px 14px',
                      backgroundColor: '#0063a3',
                      color: '#ffffff',
                      textDecoration: 'none',
                      borderRadius: '4px',
                      fontWeight: 'bold',
                      fontSize: '12px'
                    }}
                  >
                    🔑 Bei Trimble / ProjectSight Anmelden
                  </a>
                </div>
              )}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
              1. Portfolio:
            </label>
            <select
              value={selectedPortfolioId}
              onChange={(e) => setSelectedPortfolioId(e.target.value)}
              disabled={loadingPortfolios}
              style={{ width: '100%', padding: '7px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#fff', fontSize: '13px' }}
            >
              <option value="">{loadingPortfolios ? 'Lade Portfolios...' : '-- Portfolio wählen --'}</option>
              {portfolios.map((p) => (
                <option key={p.PortfolioID} value={p.PortfolioID}>
                  {p.Name || p.AccountName} ({p.PortfolioID})
                </option>
              ))}
            </select>
          </div>

          {selectedPortfolioId && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                2. Projekt:
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                disabled={loadingProjects}
                style={{ width: '100%', padding: '7px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#fff', fontSize: '13px' }}
              >
                <option value="">{loadingProjects ? 'Lade Projekte...' : '-- Projekt wählen --'}</option>
                {projects.map((prj) => (
                  <option key={prj.ProjectID || prj.Id} value={prj.ProjectID || prj.Id}>
                    {prj.Name || prj.ProjectName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedProjectId && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', color: '#2e7d32' }}>
                  3. Checklisten-Vorlage wählen (wird im Popover verwendet):
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  disabled={loadingMetadata}
                  style={{ width: '100%', padding: '7px', borderRadius: '4px', border: '1px solid #2e7d32', backgroundColor: '#f1f8e9', fontSize: '13px', fontWeight: 'bold' }}
                >
                  <option value="">{loadingMetadata ? 'Lade Vorlagen...' : '-- Vorlage wählen --'}</option>
                  {templates.map((t) => (
                    <option key={t.TemplateID || t.Id} value={t.TemplateID || t.Id}>
                      📋 {t.Name || `Vorlage #${t.TemplateID}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                  4. Workflow Status:
                </label>
                <select
                  value={selectedStateId}
                  onChange={(e) => setSelectedStateId(e.target.value)}
                  disabled={loadingMetadata}
                  style={{ width: '100%', padding: '7px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#fff', fontSize: '13px' }}
                >
                  <option value="">{loadingMetadata ? 'Lade Status...' : '-- Status wählen --'}</option>
                  {workflowStates.map((s) => (
                    <option key={s.WorkflowStateID || s.Id} value={s.WorkflowStateID || s.Id}>
                      {s.Name || s.WorkflowStateName || `Status #${s.WorkflowStateID}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                  5. Ersteller / Autor:
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  disabled={loadingMetadata}
                  style={{ width: '100%', padding: '7px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#fff', fontSize: '13px' }}
                >
                  <option value="">{loadingMetadata ? 'Lade Benutzer...' : '-- Autor wählen --'}</option>
                  {users.map((u) => (
                    <option key={u.ContactID || u.Id || u.UserID} value={u.ContactID || u.Id || u.UserID}>
                      {u.DisplayName || u.Name || `${u.FirstName || ''} ${u.LastName || ''}`.trim() || `User #${u.ContactID}`}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div style={{ marginTop: '4px' }}>
            <ModusButton
              color="primary"
              onClick={handleSaveConfig}
              disabled={!selectedPortfolioId || !selectedProjectId || !selectedTemplateId || !selectedStateId || !selectedUserId}
            >
              💾 Projekt & Vorlage für Session festlegen
            </ModusButton>
          </div>
        </div>
      )}
    </div>
  );
}
