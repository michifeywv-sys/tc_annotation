import { useState, useEffect, useCallback } from 'react';
import type { WorkspaceAPI } from 'trimble-connect-workspace-api';

export interface PlacedObject {
  id: string;
  guid?: string; // <-- NEU
  type: 'cube' | 'cylinder' | 'flag';
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  scale: number;

  storey?: string;
  storeyGuid?: string;
  buildingGuid?: string;
  siteGuid?: string;
  projectGuid?: string;
}

export function useCloudSync(api: WorkspaceAPI) {
  const [placedObjects, setPlacedObjects] = useState<PlacedObject[]>([]);

  useEffect(() => {
    const savedData = localStorage.getItem('dschungel_marker_savegame');
    if (savedData) {
      const parsed = JSON.parse(savedData);
      setPlacedObjects(parsed);
      console.log("💾 Spielstand geladen! Anzahl Objekte:", parsed.length);
    }
  }, []);

  const loadObjectsFromCloud = async () => {
    // Wird jetzt automatisch vom useEffect in der ViewerApp erledigt
  };

  // WICHTIG: useCallback verhindert, dass die Funktion bei jedem Render neu erstellt wird!
  const saveObjectsToCloud = useCallback(async (updatedList: PlacedObject[]) => {
    localStorage.setItem('dschungel_marker_savegame', JSON.stringify(updatedList));
    console.log("💾 Im Browser gespeichert! Objekte im Speicher:", updatedList.length);
  }, []);

  return {
    placedObjects,
    setPlacedObjects,
    loadObjectsFromCloud,
    saveObjectsToCloud,
  };
}