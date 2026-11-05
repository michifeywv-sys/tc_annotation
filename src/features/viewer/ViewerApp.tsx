import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { WorkspaceAPI } from 'trimble-connect-workspace-api';
import { ModusAlert, ModusButton } from '../../components/ui/NativeModusComponents';

import { useCloudSync } from './hooks/useCloudSync';
import { useTrimbleCloudAPI } from './hooks/useTrimbleCloudAPI';
import { useSpatialStructure } from './hooks/useSpatialStructure';
import { generateIfcGuid } from './utils/guid';

import { ObjectManagerPanel } from './components/ObjectManagerPanel';
import { PropertyInspectorPanel } from './components/PropertyInspectorPanel';
import { StructureSetupPanel } from './components/StructureSetupPanel';
import { ProjectSightSetupPanel } from './components/ProjectSightSetupPanel';
import { LineItemUdfTestPanel } from './components/LineItemUdfTestPanel';


interface ViewerProps {
  api: WorkspaceAPI;
}

export function ViewerApp({ api }: ViewerProps) {
  // --- STATE ---
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPlacementMode, setIsPlacementMode] = useState(false);
  const [trbBlob, setTrbBlob] = useState<Blob | null>(null); 
  const [selectedProperty, setSelectedProperty] = useState<{ name: string; value: string } | null>(null);
  const [showTestingTools, setShowTestingTools] = useState(false); // Aus standardmäßig (Turned off by default)
  const drawnModelsRef = useRef<Set<string>>(new Set());     
  
  // --- HOOKS ---
  const { placedObjects, setPlacedObjects, saveObjectsToCloud } = useCloudSync(api);
  const { saveToTrimbleCloud, loadFromTrimbleCloud, cloudError } = useTrimbleCloudAPI(api, placedObjects, setPlacedObjects, saveObjectsToCloud);
  
  const { 
    loadedModels, fetchLoadedModels, 
    selectedModelIds, setSelectedModelIds,
    availableStoreys, activeStorey, setActiveStorey,
    extractStructureFromModels 
  } = useSpatialStructure(api);

  // --- REFS FÜR EVENT LISTENER ---
  const hasLoadedFromCloud = useRef(false);

  const placementModeRef = useRef(isPlacementMode);
  placementModeRef.current = isPlacementMode;
  
  const placedObjectsRef = useRef(placedObjects);
  placedObjectsRef.current = placedObjects;

  const activeStoreyRef = useRef(activeStorey);
  activeStoreyRef.current = activeStorey;

  const selectedPropertyRef = useRef(selectedProperty);
  selectedPropertyRef.current = selectedProperty;

  // --- 1. INITIALISIERUNG ---
  useEffect(() => {
    const loadTrimbimFile = async () => {
      try {
        const response = await fetch('/zyl.trb');
        if (response.ok) {
          setTrbBlob(await response.blob());
        }
      } catch (err) {
        console.error("❌ Konnte zyl.trb nicht laden:", err);
      }
    };
    loadTrimbimFile();
  }, []);

  useEffect(() => {
    if (api && trbBlob && !hasLoadedFromCloud.current) {
      hasLoadedFromCloud.current = true;
      loadFromTrimbleCloud();
    }
  }, [api, trbBlob, loadFromTrimbleCloud]);

  // --- 2. BAUTEIL-DATEN ABRUFEN ---
  const fetchSelectionData = useCallback(async () => {
    if (!api || !api.viewer) return;
    try {
      setError(null);
      const selection = await api.viewer.getSelection();
      
      if (!selection || selection.length === 0) {
        setSelectedItems([]);
        return;
      }

      const itemsData = [];
      for (const modelSelection of selection) {
        const modelId = modelSelection.modelId;

        // Custom Zylinder abfangen
        if (modelId && modelId.startsWith('zyl_')) {
          const coreId = modelId.replace('zyl_', '');
          const foundZyl = placedObjectsRef.current.find(o => o.id === coreId);
          if (foundZyl) {
            itemsData.push({
              modelId: modelId,
              runtimeId: 'Eigenes 3D-Objekt',
              guid: foundZyl.guid || 'Keine GUID',
              propertiesGroups: [
                {
                  name: 'Geometrie & Platzierung',
                  properties: [
                    { name: 'X-Koordinate', value: `${foundZyl.position.x.toFixed(1)} mm` },
                    { name: 'Y-Koordinate', value: `${foundZyl.position.y.toFixed(1)} mm` },
                    { name: 'Z-Koordinate (Höhe)', value: `${foundZyl.position.z.toFixed(1)} mm` }
                  ]
                },
                {
                  name: 'BIM Raumbuch (IFC Hierarchy)',
                  properties: [
                    { name: 'Ebene / Pfad', value: foundZyl.storey || 'Nicht zugewiesen' },
                    { name: 'Storey GUID', value: foundZyl.storeyGuid || '-' },
                    { name: 'Building GUID', value: foundZyl.buildingGuid || '-' },
                    { name: 'Site GUID', value: foundZyl.siteGuid || '-' },
                    { name: 'Project GUID', value: foundZyl.projectGuid || '-' }
                  ]
                }
              ]
            });
          }
          continue; 
        }

        // Normale Trimble Bauteile
        const runtimeIds = modelSelection.objectRuntimeIds;
        if (!runtimeIds || runtimeIds.length === 0) continue;

        const guids = await api.viewer.convertToObjectIds(modelId, runtimeIds);
        const propertiesList = await api.viewer.getObjectProperties(modelId, runtimeIds);

        for (let i = 0; i < runtimeIds.length; i++) {
          itemsData.push({
            modelId: modelId,
            runtimeId: runtimeIds[i],
            guid: guids ? guids[i] : 'Keine GUID gefunden',
            propertiesGroups: propertiesList && propertiesList[i] ? propertiesList[i].properties : []
          });
        }
      }
      setSelectedItems(itemsData);
    } catch (err) {
      console.error("Fehler beim Abrufen der Selektion:", err);
      setError("Fehler beim Laden der Bauteildaten.");
    }
  }, [api]);

  // --- 3. EVENT LISTENER (Klicks im 3D-Modell) ---
  useEffect(() => {
    fetchSelectionData();

    const handleTrimbleEvent = (e: any) => {
      const eventName = e.detail?.event;

      if (eventName === 'viewer.onSelectionChanged') fetchSelectionData();

      if (eventName === 'viewer.onPicked' && placementModeRef.current) {
        if (!selectedPropertyRef.current) {
          alert("🛑 Bitte wähle zuerst eine Eigenschaft als Label aus!");
          setIsPlacementMode(false);
          return;
        }

        let pos = e.detail?.args?.data?.position || e.detail?.data?.position || e.detail?.position;
        if (pos) {
          const newMarker = {
            id: Math.random().toString(36).substring(2, 9),
            guid: generateIfcGuid(), 
            type: 'cylinder' as const,
            position: { x: pos.x, y: pos.y, z: pos.z },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            scale: 1,
            // Assign the property name/value to the label metadata (formerly storey path)
            storey: `${selectedPropertyRef.current.name}: ${selectedPropertyRef.current.value}`,
            storeyGuid: '',
            buildingGuid: '',
            siteGuid: '',
            projectGuid: ''
          };
          
          const updatedList = [...placedObjectsRef.current, newMarker];
          setPlacedObjects(updatedList);
          saveObjectsToCloud(updatedList);
        }
      }
    };

    window.addEventListener('trimble-event', handleTrimbleEvent);
    return () => window.removeEventListener('trimble-event', handleTrimbleEvent);
  }, [fetchSelectionData, setPlacedObjects, saveObjectsToCloud]);

  // --- 4. 3D-ZEICHNER (Smart Sync) ---
  useEffect(() => {
    const syncModels = async () => {
      if (!api || !api.viewer || !trbBlob) return;
      try {
        const currentTargetIds = new Set(placedObjects.map(obj => `zyl_${obj.id}`));

        for (const drawnId of drawnModelsRef.current) {
          if (!currentTargetIds.has(drawnId)) {
            await api.viewer.removeTrimbimModel(drawnId);
            drawnModelsRef.current.delete(drawnId);
          }
        }

        for (const obj of placedObjects) {
          const modelId = `zyl_${obj.id}`;
          if (!drawnModelsRef.current.has(modelId)) {
            await api.viewer.addTrimbimModel({
              id: modelId,
              trbBlob: trbBlob, 
              placement: {
                position: { x: obj.position.x*1000, y: obj.position.y*1000, z: obj.position.z*1000 },
                scale: 1.0 
              },
              fitToView: false
            });
            drawnModelsRef.current.add(modelId);
          }
        }
      } catch (err) {
        console.error("❌ Fehler bei der Modell-Synchronisation:", err);
      }
    };
    syncModels();
  }, [placedObjects, trbBlob, api]);

  const handleActivatePointTool = async () => {
    if (api && api.viewer) {
      await api.viewer.activateTool("pointMarkup");
    }
  };

  const handleSavePointsToBackend = async () => {
    if (!api || !api.markup || !api.viewer) return;
    try {
      const points = await api.markup.getSinglePointMarkups();
      const response = await fetch('http://localhost:8080/api/symbols', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(points)
      });
      if (response.ok) {
        alert("Punkte erfolgreich gespeichert!");
        await api.viewer.activateTool("reset");
      }
    } catch (err: any) {
      console.error("Fehler beim Speichern der Punkte:", err);
      alert("Fehler beim Speichern: " + err.message);
    }
  };

  const handleResetTool = async () => {
    if (api && api.viewer) {
      await api.viewer.activateTool("reset");
    }
  };

  const handleOpenPopover = async () => {
    if (api && api.extension) {
      await api.extension.configure({
        type: 'popover',
        url: `${window.location.origin}?mode=popover`,
        id: 'marker_tool_popover',
        title: '🖍️ 3D Marker Tool',
        width: 320,
        height: 480
      });
    }
  };

  const handleOpenChecklistPopover = async () => {
    if (api && api.extension) {
      await api.extension.configure({
        type: 'popover',
        url: `${window.location.origin}?mode=checklist-popover`,
        id: 'checklist_tool_popover',
        title: '📋 ProjectSight Checkliste',
        width: 380,
        height: 600
      });
    }
  };

  // --- UI RENDER ---
  return (
    <div style={{ width: '100%', minHeight: '100vh', padding: '20px', boxSizing: 'border-box', backgroundColor: '#ffffff' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '10px', flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, color: '#0063a3' }}>Live Bauteil-Inspektor</h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <ModusButton color="primary" onClick={handleOpenPopover}>
            🖍️ Popover Marker-Tool
          </ModusButton>
          <ModusButton color="primary" onClick={handleOpenChecklistPopover}>
            📋 Popover Checklisten-Tool
          </ModusButton>
          <ModusButton 
            color={showTestingTools ? "secondary" : "tertiary"} 
            onClick={() => setShowTestingTools(!showTestingTools)}
          >
            {showTestingTools ? "🧪 Test-Funktionen verbergen" : "🧪 Test-Funktionen aktivieren"}
          </ModusButton>
        </div>
      </div>

      <ProjectSightSetupPanel />

      <p style={{ fontSize: '14px', color: '#666', margin: '0 0 16px 0' }}>Klicke auf ein oder mehrere Bauteile im 3D-Modell.</p>

      {/* TEST-FUNKTIONEN (standardmäßig deaktiviert) */}
      {showTestingTools && (
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fff9e6', border: '1px dashed #ffa000', borderRadius: '4px' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#e65100' }}>🧪 Experimentelle Test-Funktionen</h3>
          <StructureSetupPanel 
            loadedModels={loadedModels}
            selectedModelIds={selectedModelIds}
            setSelectedModelIds={setSelectedModelIds}
            onRefreshModels={fetchLoadedModels}
            onExtractStructure={extractStructureFromModels}
            availableStoreys={availableStoreys}
            activeStorey={activeStorey}
            setActiveStorey={setActiveStorey}
          />

          <ObjectManagerPanel 
            isPlacementMode={isPlacementMode}
            setIsPlacementMode={setIsPlacementMode}
            placedObjectsCount={placedObjects.length}
            onClearAll={() => { setPlacedObjects([]); saveObjectsToCloud([]); }}
            onSaveToCloud={saveToTrimbleCloud}
            isScanning={false} // Haben wir ausgemustert
            setIsScanning={() => {}} // Haben wir ausgemustert
            spatialData={null} // Haben wir ausgemustert
            onActivatePointTool={handleActivatePointTool}
            onSavePointsToBackend={handleSavePointsToBackend}
            onResetTool={handleResetTool}
          />

          <LineItemUdfTestPanel />
        </div>
      )}


      {selectedProperty && (
        <div style={{ marginBottom: '16px' }}>
          <ModusAlert type="info" message={`Ausgewähltes Marker-Label: "${selectedProperty.name}: ${selectedProperty.value}"`} />
        </div>
      )}

      {(error || cloudError) && (
        <div style={{ marginBottom: '16px' }}>
          <ModusAlert type="error" message={error || cloudError || "Ein Fehler ist aufgetreten"} />
        </div>
      )}

      <PropertyInspectorPanel 
        selectedItems={selectedItems} 
        onSelectProperty={setSelectedProperty}
        selectedProperty={selectedProperty}
      />
      
    </div>
  );
}