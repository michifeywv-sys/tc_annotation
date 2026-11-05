import React, { useState, useEffect, useCallback } from 'react';
import type { WorkspaceAPI } from 'trimble-connect-workspace-api';
import { PropertyMarkupTool } from './PropertyMarkupTool';

interface Props {
  api: WorkspaceAPI;
}

export function MarkupPopoverApp({ api }: Props) {
  const [selectedItems, setSelectedItems] = useState<any[]>([]);

  // Holt sich die Selektion (gleiche Logik wie im Seitenpanel!)
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

        const propertiesList = await api.viewer.getObjectProperties(modelId, runtimeIds);

        for (let i = 0; i < runtimeIds.length; i++) {
          itemsData.push({
            modelId: modelId,
            runtimeId: runtimeIds[i],
            propertiesGroups: propertiesList && propertiesList[i] ? propertiesList[i].properties : []
          });
        }
      }
      setSelectedItems(itemsData);
    } catch (err) {
      console.error("Fehler im Popover:", err);
    }
  }, [api]);

  // Auf Klicks im Modell hören
  useEffect(() => {
    fetchSelectionData();
    const handleTrimbleEvent = (e: any) => {
      if (e.detail && e.detail.event === 'viewer.onSelectionChanged') fetchSelectionData();
    };
    window.addEventListener('trimble-event', handleTrimbleEvent);
    return () => window.removeEventListener('trimble-event', handleTrimbleEvent);
  }, [fetchSelectionData]);

  // Die Funktion, um das Popover wieder zu schließen (wie in deinem Trimble-HTML-Beispiel)
  const handleClose = () => {
    api.extension.configure({ type: 'popover', url: 'remove', id: 'marker_tool_popover' });
  };

  return (
    <div style={{ padding: '15px', backgroundColor: '#fff', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
        <h3 style={{ margin: 0, color: '#0063a3' }}>🖍️ 3D Marker Tool</h3>
        <button onClick={handleClose} style={{ cursor: 'pointer', border: 'none', background: 'none', fontSize: '18px', color: '#666' }}>✖</button>
      </div>
      
      {selectedItems.length > 0 ? (
        <PropertyMarkupTool api={api} selectedItems={selectedItems} />
      ) : (
        <p style={{ fontSize: '13px', color: '#666' }}>Bitte wähle ein Bauteil im Modell aus.</p>
      )}
    </div>
  );
}