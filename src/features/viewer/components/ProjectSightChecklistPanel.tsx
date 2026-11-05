import React, { useEffect, useState } from 'react';
import { ModusButton, ModusAlert } from '../../../components/ui/NativeModusComponents';
import type { WorkspaceAPI } from 'trimble-connect-workspace-api';
import { ProjectSightService } from '../../../services/ProjectSightService';
import { getSavedPSProject, savePSProject } from '../utils/psStorage';

interface ProjectSightChecklistPanelProps {
  api: WorkspaceAPI;
  selectedProperty: { name: string; value: string } | null;
  selectedItems: any[];
}

export function ProjectSightChecklistPanel({
  api,
  selectedProperty,
  selectedItems
}: ProjectSightChecklistPanelProps) {
  // Lists
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [workflowStates, setWorkflowStates] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Initialisiere mit Werten aus der Session falls vorhanden
  const saved = getSavedPSProject();

  // Selected values
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>(saved.portfolioId || '');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(saved.projectId || '');
  const [selectedStateId, setSelectedStateId] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  // Inputs
  const [checklistNumber, setChecklistNumber] = useState<string>(`CHK-${Date.now().toString().slice(-4)}`);
  const [workDescription, setWorkDescription] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Synchronisation bei Projekt-Änderungen in der Session
  useEffect(() => {
    const handlePSProjectChanged = (e: any) => {
      const { portfolioId, projectId } = e.detail || getSavedPSProject();
      if (portfolioId) setSelectedPortfolioId(portfolioId);
      if (projectId) setSelectedProjectId(projectId);
    };

    window.addEventListener('ps-project-changed', handlePSProjectChanged);
    return () => window.removeEventListener('ps-project-changed', handlePSProjectChanged);
  }, []);

  const initPortfolios = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const list = await ProjectSightService.getPortfolios();
      setPortfolios(list);

      const savedProj = getSavedPSProject();
      if (savedProj.portfolioId) {
        setSelectedPortfolioId(savedProj.portfolioId);
      } else if (list.length > 0) {
        setSelectedPortfolioId(list[0].PortfolioID);
      }
    } catch (err: any) {
      console.error('Error fetching portfolios:', err);
      setFeedback({ type: 'error', msg: err.message === 'NOT_LOGGED_IN' ? 'NOT_LOGGED_IN' : `Fehler beim Laden der Portfolios: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  // 1. Load Portfolios on mount
  useEffect(() => {
    initPortfolios();
  }, []);

  // 2. Load Projects when Portfolio changes
  useEffect(() => {
    if (!selectedPortfolioId) {
      setProjects([]);
      return;
    }
    const loadProjects = async () => {
      try {
        const list = await ProjectSightService.getProjects(selectedPortfolioId);
        setProjects(list);

        const savedProj = getSavedPSProject();
        if (savedProj.projectId && savedProj.portfolioId === selectedPortfolioId) {
          setSelectedProjectId(savedProj.projectId);
        } else if (list.length > 0) {
          const firstProjId = list[0].ProjectID || list[0].Id;
          setSelectedProjectId(firstProjId);
        } else {
          setSelectedProjectId('');
        }
      } catch (err: any) {
        console.error('Error fetching projects:', err);
      }
    };
    loadProjects();
  }, [selectedPortfolioId]);

  // Speichere Portfolio/Projekt in der Session ab, wenn der User hier etwas ändert
  const handlePortfolioChange = (pId: string) => {
    setSelectedPortfolioId(pId);
    const pObj = portfolios.find(p => p.PortfolioID === pId);
    const pName = pObj ? (pObj.Name || pObj.AccountName || pId) : pId;
    savePSProject(pId, '', pName, '');
  };

  const handleProjectChange = (prjId: string) => {
    setSelectedProjectId(prjId);
    const pObj = portfolios.find(p => p.PortfolioID === selectedPortfolioId);
    const prjObj = projects.find(p => (p.ProjectID || p.Id) === prjId);
    const pName = pObj ? (pObj.Name || pObj.AccountName || selectedPortfolioId) : selectedPortfolioId;
    const prjName = prjObj ? (prjObj.Name || prjObj.ProjectName || prjId) : prjId;
    savePSProject(selectedPortfolioId, prjId, pName, prjName);
  };

  // 3. Load Project Metadata (States, Templates, Users) when Project changes
  useEffect(() => {
    if (!selectedPortfolioId || !selectedProjectId) {
      setWorkflowStates([]);
      setTemplates([]);
      setUsers([]);
      return;
    }
    const loadMetadata = async () => {
      try {
        // Load States
        const statesList = await ProjectSightService.getWorkflowStates(selectedPortfolioId, selectedProjectId);
        setWorkflowStates(statesList);
        if (statesList.length > 0) {
          setSelectedStateId(statesList[0].WorkflowStateID || statesList[0].Id);
        }

        // Load Templates
        const templatesList = await ProjectSightService.getTemplates(selectedPortfolioId, selectedProjectId);
        setTemplates(templatesList);
        if (templatesList.length > 0) {
          setSelectedTemplateId(templatesList[0].TemplateID || templatesList[0].Id);
        }

        // Load Users
        const usersList = await ProjectSightService.getUsers(selectedPortfolioId);
        setUsers(usersList);
        if (usersList.length > 0) {
          setSelectedUserId(usersList[0].ContactID || usersList[0].Id || usersList[0].UserID);
        }
      } catch (err: any) {
        console.error('Error fetching project metadata:', err);
      }
    };
    loadMetadata();
  }, [selectedPortfolioId, selectedProjectId]);

  // 4. Update WorkDescription when Selected Property changes
  useEffect(() => {
    if (selectedProperty) {
      const guid = selectedItems[0]?.guid || 'N/A';
      setWorkDescription(`${selectedProperty.name}: ${selectedProperty.value} (GUID: ${guid})`);
    } else {
      setWorkDescription('');
    }
  }, [selectedProperty, selectedItems]);

  const handleCreateChecklist = async () => {
    if (!selectedPortfolioId || !selectedProjectId || !selectedStateId || !selectedTemplateId || !selectedUserId) {
      setFeedback({ type: 'error', msg: 'Bitte wähle alle Pflichtfelder aus.' });
      return;
    }
    setLoading(true);
    setFeedback(null);

    const itemsToProcess = selectedItems && selectedItems.length > 0 ? selectedItems : [null];
    const createdChecklists: string[] = [];
    const errors: string[] = [];

    const selectedUser = users.find(u => (u.ContactID || u.Id || u.UserID) === selectedUserId);
    const authorCompanyId = selectedUser ? (selectedUser.CompanyID || selectedUser.Company?.Id) : null;

    let index = 1;
    for (const item of itemsToProcess) {
      let finalWorkDescription = workDescription;
      
      // If there are multiple items, append index suffix to the Checklist Number
      const suffix = itemsToProcess.length > 1 ? `-${index}` : '';
      const currentChecklistNumber = `${checklistNumber}${suffix}`;

      if (item && api) {
        try {
          // 1. Get the bounding box of the selected item
          const boxes = await api.viewer.getObjectBoundingBoxes(item.modelId, [item.runtimeId]);
          if (boxes && boxes.length > 0) {
            const box = boxes[0].boundingBox;
            const center = {
              x: (box.min.x + box.max.x) / 2,
              y: (box.min.y + box.max.y) / 2,
              z: (box.min.z + box.max.z) / 2
            };

            // 2. Get current camera position to determine looking direction
            const currentCamera = await api.viewer.getCamera();
            const camPos = currentCamera.position || { x: center.x, y: center.y - 5, z: center.z + 5 };

            const dx = center.x - camPos.x;
            const dy = center.y - camPos.y;
            const dz = center.z - camPos.z;
            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz) || 1;

            // Unit direction vector
            const ux = dx / dist;
            const uy = dy / dist;
            const uz = dz / dist;

            // Position camera 1m (1.0 meter) in front of the object center
            const targetCamPos = {
              x: center.x - ux * 1.0,
              y: center.y - uy * 1.0,
              z: center.z - uz * 1.0
            };

            // Set camera looking at the center
            await api.viewer.setCamera({
              position: targetCamPos,
              lookAt: center
            });

            // 3. Create a view / viewpoint in Trimble Connect
            const newView = await api.view.createView({
              name: `Checklist viewpoint ${currentChecklistNumber}`,
              description: `Checklist attachment`
            });

            if (newView && newView.id) {
              const projectInfo = await api.project.getProject();
              const projectId = Array.isArray(projectInfo) ? projectInfo[0].id : projectInfo.id;
              const viewpointLink = `https://web.connect.trimble.com/#/project/${projectId}/viewer?viewId=${newView.id}`;
              
              // Include item identifier/guid in description
              const itemLabel = item.guid ? `GUID: ${item.guid}` : `ID: ${item.runtimeId}`;
              finalWorkDescription = `${workDescription} (${itemLabel})\n\n🔗 Viewpoint (BCF): ${viewpointLink}`;
              console.log(`Viewpoint created for item ${index}:`, viewpointLink);
            }
          }
        } catch (cameraErr) {
          console.error(`Error creating viewpoint for item ${index}:`, cameraErr);
        }
      }

      const payload = {
        portfolioId: selectedPortfolioId,
        projectId: selectedProjectId,
        WorkflowState: selectedStateId,
        TemplateID: selectedTemplateId,
        AuthorContactID: selectedUserId,
        AuthorCompanyID: authorCompanyId,
        Number: currentChecklistNumber,
        WorkDescription: finalWorkDescription
      };

      try {
        const result = await ProjectSightService.createChecklist(payload);
        createdChecklists.push(result.ChecklistID || result.Id || 'Erfolg');
      } catch (err: any) {
        console.error(`Error creating checklist for item ${index}:`, err);
        errors.push(`Item ${index}: ${err.message || 'API Fehler.'}`);
      }
      
      index++;
    }

    if (errors.length > 0 && createdChecklists.length === 0) {
      setFeedback({
        type: 'error',
        msg: `Fehler beim Erstellen der Checklisten: ${errors.join(' | ')}`
      });
    } else if (errors.length > 0) {
      setFeedback({
        type: 'error',
        msg: `Teilweise erfolgreich! ${createdChecklists.length} Checklisten erstellt, andere schlugen fehl: ${errors.join(' | ')}`
      });
    } else {
      setFeedback({
        type: 'success',
        msg: `${createdChecklists.length} Checkliste(n) erfolgreich erstellt! IDs: ${createdChecklists.join(', ')}`
      });
    }

    setLoading(false);
  };

  const isFormReady = selectedPortfolioId && selectedProjectId && selectedStateId && selectedTemplateId && selectedUserId && workDescription;

  return (
    <div style={{ backgroundColor: '#fafafa', padding: '15px', borderRadius: '4px', border: '1px solid #e0e0e0', marginTop: '20px' }}>
      <h3 style={{ marginTop: 0, fontSize: '15px', color: '#0063a3' }}>🏗️ ProjectSight Checklisten-Wizard</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        {/* Portfolio Dropdown */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
            1. Portfolio auswählen:
          </label>
          <select
            value={selectedPortfolioId}
            onChange={(e) => handlePortfolioChange(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#fff' }}
          >
            <option value="">-- Portfolio wählen --</option>
            {portfolios.map((p) => (
              <option key={p.PortfolioID} value={p.PortfolioID}>
                {p.Name} ({p.AccountName})
              </option>
            ))}
          </select>
        </div>

        {/* Project Dropdown */}
        {selectedPortfolioId && (
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
              2. Projekt auswählen:
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => handleProjectChange(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#fff' }}
            >
              <option value="">-- Projekt wählen --</option>
              {projects.map((p) => (
                <option key={p.ProjectID || p.Id} value={p.ProjectID || p.Id}>
                  {p.Name || p.ProjectName}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Metadata section */}
        {selectedProjectId && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #eee', paddingTop: '12px' }}>
            
            {/* Workflow State Dropdown */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                Workflow Status:
              </label>
              <select
                value={selectedStateId}
                onChange={(e) => setSelectedStateId(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#fff' }}
              >
                <option value="">-- Status wählen --</option>
                {workflowStates.map((s) => (
                  <option key={s.WorkflowStateID || s.Id} value={s.WorkflowStateID || s.Id}>
                    {s.Name || s.StateName || s.Id}
                  </option>
                ))}
              </select>
            </div>

            {/* Template Dropdown */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                Vorlage (Template):
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#fff' }}
              >
                <option value="">-- Vorlage wählen --</option>
                {templates.map((t) => (
                  <option key={t.TemplateID || t.Id} value={t.TemplateID || t.Id}>
                    {t.Name}
                  </option>
                ))}
              </select>
            </div>

            {/* User Dropdown */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                Ersteller / Autor:
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#fff' }}
              >
                <option value="">-- Autor wählen --</option>
                {users.map((u) => (
                  <option key={u.ContactID || u.Id || u.UserID} value={u.ContactID || u.Id || u.UserID}>
                    {u.FirstName} {u.LastName}
                  </option>
                ))}
              </select>
            </div>

            {/* Number Input */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                Checklisten-Nummer:
              </label>
              <input
                type="text"
                value={checklistNumber}
                onChange={(e) => setChecklistNumber(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
            </div>

            {/* Work Description input */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                WorkDescription (Beschreibung):
              </label>
              <input
                type="text"
                value={workDescription}
                onChange={(e) => setWorkDescription(e.target.value)}
                placeholder="Bitte eine Eigenschaft im 3D-Viewer auswählen..."
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
            </div>

            <ModusButton
              color="primary"
              onClick={handleCreateChecklist}
              disabled={!isFormReady || loading}
              style={{ width: '100%', marginTop: '10px' }}
            >
              {loading ? 'Erstelle Checkliste...' : '✨ Checkliste jetzt in ProjectSight erstellen!'}
            </ModusButton>
          </div>
        )}

        {feedback && feedback.msg === 'NOT_LOGGED_IN' ? (
          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <ModusAlert type="error" message="Bitte melde dich zuerst bei Trimble an, um auf ProjectSight zuzugreifen." />
            <ModusButton
              color="secondary"
              onClick={() => window.open('/login', 'TrimbleLogin', 'width=800,height=600')}
              style={{ width: '100%' }}
            >
              🔑 Login mit Trimble
            </ModusButton>
            <ModusButton
              color="primary"
              onClick={initPortfolios}
              style={{ width: '100%' }}
            >
              🔄 Erneut versuchen
            </ModusButton>
          </div>
        ) : (
          feedback && <ModusAlert type={feedback.type} message={feedback.msg} />
        )}
      </div>
    </div>
  );
}
