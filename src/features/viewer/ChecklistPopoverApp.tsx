import React, { useState, useEffect, useCallback } from 'react';
import type { WorkspaceAPI } from 'trimble-connect-workspace-api';
import { ChecklistPropertyMapper } from './components/ChecklistPropertyMapper';

interface Props {
  api: WorkspaceAPI;
}

export function ChecklistPopoverApp({ api }: Props) {
  const [selectedItems, setSelectedItems] = useState<any[]>([]);

  // Holt die aktuelle 3D-Selektion aus Trimble Connect
  const fetchSelectionData = useCallback(async () => {
    if (!api || !api.viewer) return;
    try {
      const selection = await api.viewer.getSelection();
      if (!selection || selection.length === 0) {
        setSelectedItems([]);
        return;
      }
      const itemsData = [];
      for (const modelSelection of selection) {
        const modelId = modelSelection.modelId;
        const runtimeIds = modelSelection.objectRuntimeIds;
        if (!runtimeIds || runtimeIds.length === 0) continue;

        const guids = await api.viewer.convertToObjectIds(modelId, runtimeIds);
        const propertiesList = await api.viewer.getObjectProperties(modelId, runtimeIds);

        for (let i = 0; i < runtimeIds.length; i++) {
          itemsData.push({
            modelId: modelId,
            runtimeId: runtimeIds[i],
            guid: guids ? guids[i] : 'Keine GUID',
            propertiesGroups: propertiesList && propertiesList[i] ? propertiesList[i].properties : []
          });
        }
      }
      setSelectedItems(itemsData);
    } catch (err) {
      console.error("Fehler beim Laden der Bauteildaten im Popover:", err);
    }
  }, [api]);

  // Auf Selektionsänderungen im 3D-Modell hören
  useEffect(() => {
    fetchSelectionData();
    const handleTrimbleEvent = (e: any) => {
      if (e.detail && e.detail.event === 'viewer.onSelectionChanged') {
        fetchSelectionData();
      }
    };
    window.addEventListener('trimble-event', handleTrimbleEvent);
    return () => window.removeEventListener('trimble-event', handleTrimbleEvent);
  }, [fetchSelectionData]);

  // Popover Fenster schließen
  const handleClose = () => {
    api.extension.configure({ type: 'popover', url: 'remove', id: 'checklist_tool_popover' });
  };

  return (
    <div style={{ padding: '15px', backgroundColor: '#fff', minHeight: '100vh', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
        <h3 style={{ margin: 0, color: '#0063a3', fontSize: '16px' }}>📋 ProjectSight Checklisten-Tool</h3>
        <button 
          onClick={handleClose} 
          style={{ cursor: 'pointer', border: 'none', background: 'none', fontSize: '18px', color: '#666' }}
          title="Schließen"
        >
          ✖
        </button>
      </div>

      <ChecklistPropertyMapper
        api={api}
        selectedItems={selectedItems}
      />
    </div>
  );
}
