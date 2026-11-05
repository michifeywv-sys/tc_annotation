import React, { useState, useEffect, useMemo } from 'react';
import { ModusButton, ModusAlert } from '../../../components/ui/NativeModusComponents';
import type { WorkspaceAPI } from 'trimble-connect-workspace-api';
import { ProjectSightService } from '../../../services/ProjectSightService';
import { getSavedPSProject } from '../utils/psStorage';
import { parseChecklistItems, type ParsedTemplateItem } from '../utils/checklistParser';
import { DynamicChecklistForm } from './DynamicChecklistForm';

interface ChecklistPropertyMapperProps {
  api: WorkspaceAPI;
  selectedItems: any[];
}

const DECIMAL_OPTIONS = [
  { label: 'Original', value: null },
  { label: '0', value: 0 },
  { label: '1', value: 1 },
  { label: '2', value: 2 },
  { label: '3', value: 3 }
];

export function ChecklistPropertyMapper({ api, selectedItems }: ChecklistPropertyMapperProps) {
  const [activeSession, setActiveSession] = useState(getSavedPSProject());

  useEffect(() => {
    const handlePSChanged = () => {
      setActiveSession(getSavedPSProject());
    };
    window.addEventListener('ps-project-changed', handlePSChanged);
    return () => window.removeEventListener('ps-project-changed', handlePSChanged);
  }, []);

  const { portfolioId, projectId, projectName, templateId, templateName, stateId, userId } = activeSession;

  // Property Selection State (Marker-Tool Style Accordion)
  const [selectedProps, setSelectedProps] = useState<string[]>([]);
  const [decimals, setDecimals] = useState<number | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [favoriteGroup, setFavoriteGroup] = useState<string | null>(() => {
    return localStorage.getItem('trimble_favorite_pset') || null;
  });

  // Dynamic Template Items & Form State
  const [templateItems, setTemplateItems] = useState<ParsedTemplateItem[]>([]);
  const [loadingItems, setLoadingItems] = useState<boolean>(false);
  const [itemPropertyMappings, setItemPropertyMappings] = useState<Record<number, string>>({}); // { [TemplateItemID]: propKey }

  // Multi-Field Mapping States
  const [numberPropKey, setNumberPropKey] = useState<string>(''); // For Checklist Number
  const [customNumber, setCustomNumber] = useState<string>(`CHK-${Date.now().toString().slice(-4)}`);
  const [specPropsKeys, setSpecPropsKeys] = useState<string[]>([]);
  const [customNotes, setCustomNotes] = useState<string>('');


  // ProjectSight UDFs State
  const [udfList, setUdfList] = useState<any[]>([]);
  const [udfMappings, setUdfMappings] = useState<Record<string, string>>({});
  const [loadingUdfs, setLoadingUdfs] = useState<boolean>(false);

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // 1. Fetch ProjectSight UDFs for the Portfolio
  useEffect(() => {
    if (!portfolioId) return;
    const fetchUdfs = async () => {
      setLoadingUdfs(true);
      try {
        const udfs = await ProjectSightService.getUdfs(portfolioId);
        setUdfList(udfs);
      } catch (err) {
        console.error("Fehler beim Laden der UDFs:", err);
      } finally {
        setLoadingUdfs(false);
      }
    };
    fetchUdfs();
  }, [portfolioId]);

  // 2. Fetch & Parse Dynamic Template Items for active Template
  useEffect(() => {
    if (!portfolioId || !projectId || !templateId) return;

    const fetchTemplateItems = async () => {
      setLoadingItems(true);
      try {
        const data = await ProjectSightService.getChecklistsFull(portfolioId, projectId);
        const parsed = parseChecklistItems(data, templateId);

        // Fallback default template items if API returns empty array for new template
        if (parsed.length === 0) {
          setTemplateItems([
            { TemplateItemID: 101, Description: 'Kategorie / Abschnitt', ValueType: 11, IncludeYesNoNA: false, Value: '' },
            { TemplateItemID: 102, Description: 'Sichtprüfung Bauteil', ValueType: 10, IncludeYesNoNA: true, Value: 'Ja', Status: 'Pass' },
            { TemplateItemID: 103, Description: 'Maßhaltigkeit & Toleranz', ValueType: 10, IncludeYesNoNA: true, Value: 'Ja', Status: 'Pass' },
            { TemplateItemID: 104, Description: 'Prüfdatum & Freigabe', ValueType: 3, IncludeYesNoNA: false, Value: new Date().toISOString().slice(0, 16) },
            { TemplateItemID: 105, Description: 'Prüfer Unterschrift / Kontakt', ValueType: 13, IncludeYesNoNA: false, Value: '' }
          ]);
        } else {
          setTemplateItems(parsed);
        }
      } catch (err) {
        console.warn("Konnte Vorlagen-Items nicht von der API laden, verwende Standard-Felder:", err);
        setTemplateItems([
          { TemplateItemID: 101, Description: 'Kategorie / Abschnitt', ValueType: 11, IncludeYesNoNA: false, Value: '' },
          { TemplateItemID: 102, Description: 'Sichtprüfung Bauteil', ValueType: 10, IncludeYesNoNA: true, Value: 'Ja', Status: 'Pass' },
          { TemplateItemID: 103, Description: 'Maßhaltigkeit & Toleranz', ValueType: 10, IncludeYesNoNA: true, Value: 'Ja', Status: 'Pass' },
          { TemplateItemID: 104, Description: 'Prüfdatum & Freigabe', ValueType: 3, IncludeYesNoNA: false, Value: new Date().toISOString().slice(0, 16) }
        ]);
      } finally {
        setLoadingItems(false);
      }
    };

    fetchTemplateItems();
  }, [portfolioId, projectId, templateId]);

  // Formatter for values with decimals & units
  const formatValue = (val: any, dec: number | null) => {
    if (dec === null || val === null || val === undefined) return String(val);
    const strVal = String(val).trim();
    const match = strVal.match(/^([-+]?\d+(?:[.,]\d+)?)\s*(.*)$/);
    if (match) {
      const numericPart = match[1].replace(',', '.');
      const num = parseFloat(numericPart);
      if (!isNaN(num)) {
        const formattedNum = num.toFixed(dec).replace('.', ',');
        const unit = match[2] ? ` ${match[2]}` : '';
        return `${formattedNum}${unit}`;
      }
    }
    return strVal;
  };

  // Grouped Psets (Marker Tool Style Accordion & Favorites)
  const groupedProperties = useMemo(() => {
    if (!selectedItems || selectedItems.length === 0) return [];
    const groupsMap = new Map<string, Set<string>>();
    selectedItems[0].propertiesGroups?.forEach((group: any) => {
      const gName = group.name || "Ohne Gruppe";
      if (!groupsMap.has(gName)) groupsMap.set(gName, new Set<string>());
      group.properties?.forEach((p: any) => { if (p.name) groupsMap.get(gName)!.add(p.name); });
    });

    let groupsArray = Array.from(groupsMap.entries()).map(([gName, props]) => ({
      groupName: gName,
      properties: Array.from(props).sort()
    })).sort((a, b) => a.groupName.localeCompare(b.groupName));

    if (favoriteGroup) {
      const favIndex = groupsArray.findIndex(g => g.groupName === favoriteGroup);
      if (favIndex > 0) {
        const favObj = groupsArray.splice(favIndex, 1)[0];
        groupsArray.unshift(favObj);
      }
    }
    return groupsArray;
  }, [selectedItems, favoriteGroup]);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => prev.includes(groupName) ? prev.filter(g => g !== groupName) : [...prev, groupName]);
  };

  const toggleFavorite = (e: React.MouseEvent, groupName: string) => {
    e.stopPropagation();
    const newFav = favoriteGroup === groupName ? null : groupName;
    setFavoriteGroup(newFav);
    if (newFav) localStorage.setItem('trimble_favorite_pset', newFav);
    else localStorage.removeItem('trimble_favorite_pset');
  };

  const toggleProperty = (groupName: string, propName: string) => {
    const key = `${groupName}|${propName}`;
    setSelectedProps(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  // Read formatted property value for a 3D item
  const getPropValueForItem = (item: any, propKey: string): string | null => {
    if (!item || !propKey) return null;
    const [gName, pName] = propKey.split('|');
    for (const group of (item.propertiesGroups || [])) {
      if ((group.name || "Ohne Gruppe") === gName) {
        for (const p of (group.properties || [])) {
          if (p.name === pName) {
            return formatValue(p.value, decimals);
          }
        }
      }
    }
    return null;
  };

  // Handler for item change in dynamic form
  const handleItemChange = (templateItemId: number, updatedFields: Partial<ParsedTemplateItem>) => {
    setTemplateItems(prev => prev.map(it => it.TemplateItemID === templateItemId ? { ...it, ...updatedFields } : it));
  };

  // Batch populate handler
  const handleBatchPopulate = (action: 'Pass' | 'NA' | 'Reset' | 'DateToday') => {
    setTemplateItems(prev => prev.map(item => {
      if (action === 'Pass') {
        if (item.ValueType === 10 || item.IncludeYesNoNA) {
          return { ...item, Status: 'Pass', Value: 'Ja' };
        }
      } else if (action === 'NA') {
        if (item.ValueType === 10 || item.IncludeYesNoNA) {
          return { ...item, Status: 'NA', Value: 'N/A' };
        }
      } else if (action === 'DateToday') {
        if (item.ValueType === 3) {
          return { ...item, Value: new Date().toISOString().slice(0, 16) };
        }
      } else if (action === 'Reset') {
        if (item.ValueType !== 11) {
          return { ...item, Value: '', Status: '', Comments: '' };
        }
      }
      return item;
    }));
  };

  // Build field mapping description for WorkDescription
  const buildFieldMappingForItem = (item: any) => {
    if (!item) return { mainDesc: customNotes, specDesc: '' };

    const mainLines: string[] = [];
    const specLines: string[] = [];

    selectedProps.forEach(propKey => {
      if (propKey === numberPropKey) return;
      const [, pName] = propKey.split('|');
      const val = getPropValueForItem(item, propKey);
      if (val !== null) {
        if (specPropsKeys.includes(propKey)) {
          specLines.push(`• ${pName}: ${val}`);
        } else {
          mainLines.push(`${pName}: ${val}`);
        }
      }
    });

    let mainDesc = mainLines.join('\n');
    if (customNotes.trim() !== '') {
      mainDesc = mainDesc ? `${mainDesc}\n\n${customNotes}` : customNotes;
    }

    let specDesc = specLines.join('\n');
    return { mainDesc, specDesc };
  };

  // POST-Request: Create checklist in ProjectSight mapping values to TemplateItemID
  const handleCreateChecklists = async () => {
    if (!portfolioId || !projectId || !templateId || !stateId || !userId) {
      setFeedback({ type: 'error', msg: 'Bitte wähle zuerst im Seitenpanel Projekt & Vorlage aus.' });
      return;
    }

    setLoading(true);
    setFeedback(null);

    const itemsToProcess = selectedItems && selectedItems.length > 0 ? selectedItems : [null];
    const createdChecklists: string[] = [];
    const errors: string[] = [];

    let index = 1;
    for (const item of itemsToProcess) {
      const { mainDesc, specDesc } = buildFieldMappingForItem(item);
      
      let fullWorkDescription = mainDesc;
      if (specDesc) {
        fullWorkDescription = fullWorkDescription 
          ? `${fullWorkDescription}\n\n📌 Prüfpunkte & Bauteil-Spezifikation:\n${specDesc}`
          : `📌 Prüfpunkte & Bauteil-Spezifikation:\n${specDesc}`;
      }

      let itemChecklistNumber = customNumber;
      if (item && numberPropKey) {
        const val = getPropValueForItem(item, numberPropKey);
        if (val) itemChecklistNumber = val;
      }
      if (itemsToProcess.length > 1 && !numberPropKey) {
        itemChecklistNumber = `${customNumber}-${index}`;
      }

      // Camera Viewpoint in Trimble Connect
      if (item && api && api.viewer && api.view) {
        try {
          const boxes = await api.viewer.getObjectBoundingBoxes(item.modelId, [item.runtimeId]);
          if (boxes && boxes.length > 0) {
            const box = boxes[0].boundingBox;
            const center = {
              x: (box.min.x + box.max.x) / 2,
              y: (box.min.y + box.max.y) / 2,
              z: (box.min.z + box.max.z) / 2
            };

            const currentCamera = await api.viewer.getCamera();
            const camPos = currentCamera?.position || { x: center.x, y: center.y - 5, z: center.z + 5 };

            const dx = center.x - camPos.x;
            const dy = center.y - camPos.y;
            const dz = center.z - camPos.z;
            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz) || 1;

            const targetCamPos = {
              x: center.x - (dx / dist) * 1.0,
              y: center.y - (dy / dist) * 1.0,
              z: center.z - (dz / dist) * 1.0
            };

            await api.viewer.setCamera({ position: targetCamPos, lookAt: center });

            const newView = await api.view.createView({
              name: `Checkliste ${itemChecklistNumber}`,
              description: `Viewpoint für Checkliste ${itemChecklistNumber}`
            });

            if (newView && newView.id) {
              const projectInfo = await api.project.getProject();
              const tcProjectId = Array.isArray(projectInfo) ? projectInfo[0].id : projectInfo.id;
              const viewpointLink = `https://web.connect.trimble.com/#/project/${tcProjectId}/viewer?viewId=${newView.id}`;
              const itemLabel = item.guid ? `GUID: ${item.guid}` : `ID: ${item.runtimeId}`;

              fullWorkDescription = `${fullWorkDescription}\n(${itemLabel})\n\n🔗 Viewpoint (BCF): ${viewpointLink}`;
            }
          }
        } catch (camErr) {
          console.error("Kamera Viewpoint Fehler:", camErr);
        }
      }

      // UDF Values payload
      const udfValuesPayload: Record<string, any> = {};
      if (item && Object.keys(udfMappings).length > 0) {
        Object.entries(udfMappings).forEach(([udfName, propKey]) => {
          if (propKey) {
            const val = getPropValueForItem(item, propKey);
            if (val !== null && val !== undefined) {
              udfValuesPayload[udfName] = val;
            }
          }
        });
      }

      const createPayload: any = {
        portfolioId,
        projectId,
        WorkflowState: stateId,
        TemplateID: templateId,
        AuthorContactID: userId,
        Number: itemChecklistNumber,
        WorkDescription: fullWorkDescription || `Checkliste ${itemChecklistNumber}`,
        udfValues: udfValuesPayload
      };

      try {
        // Step 1: Create base checklist instance from template
        const createResult = await ProjectSightService.createChecklist(createPayload);
        const checklistId = createResult.ChecklistID || createResult.Id || createResult.id;

        if (checklistId) {
          // Step 2: Fetch created checklist to get instantiated ChecklistItems
          let fullCreatedChecklist: any = createResult;
          if (!Array.isArray(createResult.ChecklistItems) && !Array.isArray(createResult.Items)) {
            try {
              fullCreatedChecklist = await ProjectSightService.getChecklist(portfolioId, projectId, checklistId);
            } catch (fetchErr) {
              console.warn("Konnte neu erstellte Checkliste nicht per GET abrufen:", fetchErr);
            }
          }

          const rawInstantiatedItems = fullCreatedChecklist.ChecklistItems || fullCreatedChecklist.Items || fullCreatedChecklist.items || [];

          if (rawInstantiatedItems.length > 0) {
            // Step 3: Write values directly into Value property of ChecklistItems using persistent TemplateItemID
            const updatedChecklistItems = rawInstantiatedItems.map((inst: any) => {
              const itemId = parseInt(inst.ChecklistItemID || inst.Id || inst.ItemID);
              const tId = parseInt(inst.TemplateItemID || inst.TemplateItemId || 0);

              // Map by persistent TemplateItemID
              const formItem = templateItems.find(t => t.TemplateItemID === tId) ||
                               templateItems.find(t => t.Description === inst.Description);

              let itemVal = formItem ? formItem.Value : (inst.Value || inst.Text || '');

              // Direct 3D Model Property Mapping by TemplateItemID
              const mappedPropKey = itemPropertyMappings[tId] || (formItem ? itemPropertyMappings[formItem.TemplateItemID] : null);
              if (mappedPropKey && item) {
                const mappedVal = getPropValueForItem(item, mappedPropKey);
                if (mappedVal !== null && mappedVal !== undefined) {
                  itemVal = mappedVal;
                }
              }

              const finalVal = itemVal !== undefined && itemVal !== null ? String(itemVal) : '';
              const finalStatus = formItem?.Status || inst.Status || (formItem?.IncludeYesNoNA || formItem?.ValueType === 10 ? 'Pass' : 'None');

              return {
                ...inst,
                ChecklistItemID: itemId,
                Id: itemId,
                TemplateItemID: tId,
                Description: inst.Description || (formItem ? formItem.Description : ''),
                Value: finalVal,
                Status: finalStatus,
                Comments: formItem?.Comments || inst.Comments || ''
              };
            });

            // Step 4: HTTP PUT to update checklist instance with populated ChecklistItems array
            const updatePayload = {
              ...fullCreatedChecklist,
              ChecklistID: parseInt(checklistId),
              Id: parseInt(checklistId),
              ChecklistItems: updatedChecklistItems
            };
            delete updatePayload.Items; // Deprecated redundant Items array removed!

            await ProjectSightService.updateChecklist(portfolioId, projectId, checklistId, updatePayload);
          }
        }

        createdChecklists.push(checklistId || itemChecklistNumber);
      } catch (err: any) {
        console.error("Fehler beim Erstellen/Aktualisieren der Checkliste:", err);
        errors.push(`Item ${index}: ${err.message}`);
      }

      index++;
    }

    if (errors.length > 0 && createdChecklists.length === 0) {
      setFeedback({ type: 'error', msg: `Fehler beim Erstellen: ${errors.join(' | ')}` });
    } else if (errors.length > 0) {
      setFeedback({ type: 'error', msg: `Teilweise erstellt (${createdChecklists.length}): ${createdChecklists.join(', ')}. Fehler: ${errors.join(' | ')}` });
    } else {
      setFeedback({ type: 'success', msg: `🎉 ${createdChecklists.length} Checkliste(n) für Vorlage "${templateName || templateId}" erfolgreich erstellt!` });
    }

    setLoading(false);
  };

  if (!portfolioId || !projectId || !templateId) {
    return (
      <div style={{ padding: '15px' }}>
        <ModusAlert
          type="warning"
          message="⚠️ Bitte wähle zuerst im Haupt-Seitenpanel dein ProjectSight-Projekt und eine Checklisten-Vorlage aus."
        />
      </div>
    );
  }

  return (

    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* HEADER: SESSION TEMPLATE & PROJECT */}
      <div style={{ padding: '10px 14px', backgroundColor: '#e8f5e9', borderRadius: '4px', border: '1px solid #2e7d32', fontSize: '12px' }}>
        <div style={{ color: '#555', textTransform: 'uppercase', fontSize: '10px', fontWeight: 'bold' }}>
          Festgelegte Vorlage & Projekt (Session):
        </div>
        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#2e7d32', marginTop: '2px' }}>
          📋 {templateName || `Vorlage #${templateId}`}
        </div>
        <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>
          Projekt: <strong>{projectName || projectId}</strong>
        </div>
      </div>

      {feedback && <ModusAlert type={feedback.type} message={feedback.msg} />}

      {/* SCHRITT 1: DYNAMISCHE VORLAGEN-FELDER & METADATEN (TEMPLATE ITEM METADATA & FORM) */}
      <div style={{ border: '1px solid #0063a3', borderRadius: '6px', padding: '12px', backgroundColor: '#f8fafc' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#0063a3', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>📋</span> 1. Dynamische Vorlagen-Felder (TemplateItemID & Metadata Form)
        </h4>

        <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '12px' }}>
          {loadingItems ? 'Lade Vorlagen-Felder...' : `Gefundene Feldelemente: ${templateItems.length}. Bearbeite Werte oder ordne 3D-Modelleigenschaften zu:`}
        </div>

        <DynamicChecklistForm
          items={templateItems}
          onChangeItem={handleItemChange}
          onBatchPopulate={handleBatchPopulate}
        />

        {/* 3D Property Zuordnung pro TemplateItemID */}
        {selectedProps.length > 0 && templateItems.length > 0 && (
          <div style={{ marginTop: '14px', borderTop: '1px dashed #cbd5e1', paddingTop: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#0063a3', marginBottom: '6px' }}>
              🔗 3D-Modelleigenschaft direkt an TemplateItemID binden:
            </div>
            {templateItems.filter(i => i.ValueType !== 11).map(tItem => (
              <div key={tItem.TemplateItemID} style={{ marginBottom: '6px', fontSize: '11px' }}>
                <span style={{ fontWeight: 'bold', color: '#334155' }}>
                  [{tItem.TemplateItemID}] {tItem.Description}:
                </span>
                <select
                  value={itemPropertyMappings[tItem.TemplateItemID] || ''}
                  onChange={(e) => setItemPropertyMappings(prev => ({ ...prev, [tItem.TemplateItemID]: e.target.value }))}
                  style={{ width: '100%', padding: '4px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', marginTop: '2px', backgroundColor: '#fff' }}
                >
                  <option value="">-- Manuell / Formularwert verwenden --</option>
                  {selectedProps.map(key => {
                    const [g, p] = key.split('|');
                    return <option key={key} value={key}>{g} ➔ {p}</option>;
                  })}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SCHRITT 2: 3D-BAUTEILEIGENSCHAFTEN AUSWÄHLEN (ACCORDION & FAVORITES) */}
      <div style={{ border: '1px solid #ccc', borderRadius: '4px', padding: '12px', backgroundColor: '#fff' }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#0063a3' }}>
          2. 3D-Bauteileigenschaften auswählen (Marker-Tool Stil)
        </h4>

        {/* Rundungsauswahl */}
        <div style={{ marginBottom: '10px' }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>Kommastellen runden:</div>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {DECIMAL_OPTIONS.map(opt => (
              <div
                key={opt.label}
                onClick={() => setDecimals(opt.value)}
                style={{
                  padding: '3px 7px', fontSize: '11px', cursor: 'pointer', borderRadius: '4px',
                  border: decimals === opt.value ? '2px solid #0063a3' : '1px solid #ccc',
                  backgroundColor: decimals === opt.value ? '#e6f0f9' : '#fff',
                  fontWeight: decimals === opt.value ? 'bold' : 'normal',
                  userSelect: 'none'
                }}
              >
                {opt.label}
              </div>
            ))}
          </div>
        </div>

        {/* Akkordeon-Gruppen */}
        <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #eee', padding: '4px', backgroundColor: '#fafafa' }}>
          {groupedProperties.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#888', padding: '8px' }}>Bitte selektiere ein Bauteil im 3D-Modell.</div>
          ) : (
            groupedProperties.map(group => {
              const isExpanded = expandedGroups.includes(group.groupName);
              const isFavorite = favoriteGroup === group.groupName;

              return (
                <div key={group.groupName} style={{ marginBottom: '4px', border: '1px solid #e0e0e0', borderRadius: '4px', backgroundColor: '#fff' }}>
                  <div
                    onClick={() => toggleGroup(group.groupName)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', backgroundColor: isFavorite ? '#fffde7' : '#f5f5f5', cursor: 'pointer' }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#333', userSelect: 'none' }}>
                      <span style={{ display: 'inline-block', width: '14px', color: '#666' }}>{isExpanded ? '▼' : '▶'}</span>
                      {group.groupName}
                    </div>
                    <div
                      onClick={(e) => toggleFavorite(e, group.groupName)}
                      title="Als Favorit markieren"
                      style={{ fontSize: '15px', color: isFavorite ? '#fbc02d' : '#ccc', cursor: 'pointer', padding: '0 4px' }}
                    >
                      {isFavorite ? '★' : '☆'}
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ padding: '6px 6px 6px 22px', borderTop: '1px solid #eee' }}>
                      {group.properties.map(prop => {
                        const key = `${group.groupName}|${prop}`;
                        return (
                          <label key={key} style={{ display: 'block', fontSize: '11px', marginBottom: '3px', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={selectedProps.includes(key)}
                              onChange={() => toggleProperty(group.groupName, prop)}
                              style={{ marginRight: '6px' }}
                            />
                            {prop}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* SCHRITT 3: SCHLÜSSELFELDER & UDF MAPPING */}
      <div style={{ border: '1px solid #0063a3', borderRadius: '4px', padding: '12px', backgroundColor: '#fafafa' }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#0063a3' }}>
          3. Checklisten-Kopfdaten & UDF Zuordnung
        </h4>

        {/* Feld 1: Nummer */}
        <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '4px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#0063a3', marginBottom: '3px' }}>
            📌 Checklisten-Nummer (Number)
          </label>
          <select
            value={numberPropKey}
            onChange={(e) => setNumberPropKey(e.target.value)}
            style={{ width: '100%', padding: '5px', fontSize: '11px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="">-- Manuelle Nummer oder Präfix verwenden --</option>
            {selectedProps.map(key => {
              const [g, p] = key.split('|');
              return <option key={key} value={key}>{g} ➔ {p}</option>;
            })}
          </select>
          {!numberPropKey && (
            <input
              type="text"
              value={customNumber}
              onChange={(e) => setCustomNumber(e.target.value)}
              placeholder="CHK-001"
              style={{ width: '100%', padding: '5px', fontSize: '11px', borderRadius: '4px', border: '1px solid #ccc', marginTop: '4px', boxSizing: 'border-box' }}
            />
          )}
        </div>

        {/* Feld 2: ProjectSight UDF-Felder */}
        <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: '#eef7ff', border: '1px solid #0063a3', borderRadius: '4px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#0063a3', marginBottom: '3px' }}>
            🧩 ProjectSight UDF-Felder (User Defined Fields)
          </label>
          <div style={{ fontSize: '10px', color: '#555', marginBottom: '6px' }}>
            {loadingUdfs ? 'Lade ProjectSight UDFs...' : udfList.length === 0 ? 'Keine UDFs für dieses Portfolio konfiguriert.' : 'Zuordnung von 3D-Eigenschaften zu ProjectSight UDF-Feldern:'}
          </div>

          {udfList.map((udf: any) => {
            const udfName = udf.Name || udf.Caption;
            const labelText = udf.Caption ? `${udf.Caption} (${udf.Name})` : udf.Name;
            const currentMappedKey = udfMappings[udfName] || '';

            return (
              <div key={udfName} style={{ marginBottom: '6px', borderBottom: '1px solid #d0e4f7', paddingBottom: '4px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#333' }}>
                  {labelText} <span style={{ fontSize: '9px', color: '#666', fontWeight: 'normal' }}>[{udf.Type || 'Text'}]</span>:
                </label>
                <select
                  value={currentMappedKey}
                  onChange={(e) => {
                    const val = e.target.value;
                    setUdfMappings(prev => ({ ...prev, [udfName]: val }));
                  }}
                  style={{ width: '100%', padding: '4px', fontSize: '11px', borderRadius: '4px', border: '1px solid #b0cce5', backgroundColor: '#fff', marginTop: '2px' }}
                >
                  <option value="">-- Nicht zuweisen --</option>
                  {selectedProps.map(key => {
                    const [g, p] = key.split('|');
                    return <option key={key} value={key}>{g} ➔ {p}</option>;
                  })}
                </select>
              </div>
            );
          })}
        </div>

        {/* LIVE VORSCHAU DER FELDER */}
        <div style={{ padding: '8px', backgroundColor: '#fff', border: '1px dashed #0063a3', borderRadius: '4px' }}>
          <div style={{ fontSize: '10px', color: '#0063a3', fontWeight: 'bold', textTransform: 'uppercase' }}>
            🔍 Vorschau der Checklisten-Payload (TemplateItems & UDFs):
          </div>
          <div style={{ marginTop: '4px', fontSize: '11px' }}>
            <strong>Nummer:</strong> {numberPropKey ? (selectedItems.length > 0 ? getPropValueForItem(selectedItems[0], numberPropKey) : '') : customNumber}<br />
            <strong>Anzahl Items in Payload:</strong> {templateItems.length}<br />
            {templateItems.slice(0, 3).map(it => (
              <div key={it.TemplateItemID} style={{ fontSize: '10px', color: '#475569', margin: '2px 0' }}>
                • [{it.TemplateItemID}] {it.Description}: <strong>{it.Value || '(Leer)'}</strong> {it.Status ? `[${it.Status}]` : ''}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* CHECKLISTEN ERSTELLUNG BUTTON */}
      <div>
        <ModusButton
          color="primary"
          onClick={handleCreateChecklists}
          disabled={loading}
          style={{ width: '100%' }}
        >
          {loading ? 'Erstelle Checkliste in ProjectSight...' : `✨ Checkliste für "${templateName || templateId}" erstellen`}
        </ModusButton>
      </div>

    </div>
  );
}
