import { useState, useEffect, useRef } from 'react';
import type { WorkspaceAPI } from 'trimble-connect-workspace-api';

export interface SpatialStructure {
  storeyName?: string;
  fullPath?: string;
  // NEU: Hier speichern wir die echten IFC GUIDs
  storeyGuid?: string;
  buildingGuid?: string;
  siteGuid?: string;
  projectGuid?: string;
}

enum LocalHierarchyType {
  Spatial = 0,
  Containment = 2
}

export function useIfcScanner(api: WorkspaceAPI) {
  const [isScanning, setIsScanning] = useState(false);
  const [spatialData, setSpatialData] = useState<SpatialStructure | null>(null);
  
  const scanningRef = useRef(isScanning);
  scanningRef.current = isScanning;

  useEffect(() => {
    if (!api || !api.viewer) return;

    const handleTrimbleEvent = async (e: any) => {
      const eventName = e.detail?.event;

      if (eventName === 'viewer.onPicked' && scanningRef.current) {
        console.log("🕵️‍♂️ SCANNER AKTIV: Hole BIM-Hierarchie & GUIDs...");
        
        try {
          const selection = await api.viewer.getSelection();
          if (!selection || selection.length === 0) return;

          const modelId = selection[0].modelId;
          const runtimeIds = selection[0].objectRuntimeIds;

          if (!runtimeIds || runtimeIds.length === 0) return;

          // 1. Hierarchie abfragen (Spatial oder Containment)
          let parents = await api.viewer.getHierarchyParents(modelId, runtimeIds, LocalHierarchyType.Spatial, true);
          
          if (!parents || parents.length === 0) {
            parents = await api.viewer.getHierarchyParents(modelId, runtimeIds, LocalHierarchyType.Containment, true);
          }

          if (parents && parents.length > 0) {
            // 2. Extrahiere die internen IDs der Hierarchie-Ebenen
            const parentIds = parents.map((p: any) => p.id);

            // 3. Wandle die internen IDs in echte IFC GUIDs um
            const guids = await api.viewer.convertToObjectIds(modelId, parentIds);
            
            // 4. Hole die Eigenschaften, um die IFC-Klassen (IfcBuilding, IfcSite etc.) zu identifizieren
            const propsList = await api.viewer.getObjectProperties(modelId, parentIds);

            let storeyGuid, buildingGuid, siteGuid, projectGuid;
            let storeyName = parents[0]?.name || 'Unbekanntes Geschoss';

            // 5. Wir iterieren durch die Ebenen und weisen die GUIDs den richtigen IFC-Klassen zu
            for (let i = 0; i < parents.length; i++) {
              const ifcClass = propsList[i]?.class; // z.B. 'IfcBuildingStorey'
              const guid = guids ? guids[i] : undefined;

              if (ifcClass === 'IfcProject') projectGuid = guid;
              if (ifcClass === 'IfcSite') siteGuid = guid;
              if (ifcClass === 'IfcBuilding') buildingGuid = guid;
              if (ifcClass === 'IfcBuildingStorey' || ifcClass === 'IfcSpace') {
                storeyGuid = guid;
                storeyName = parents[i].name;
              }
            }

            // Fallback: Falls das Modell keine sauberen IFC-Klassen hat, nehmen wir einfach das direkteste Parent
            if (!storeyGuid && guids && guids.length > 0) {
              storeyGuid = guids[0];
            }

            const storyPath = parents.map((p: any) => p.name || 'Unbekannt').join(" > ");
            
            // 6. Im State speichern!
            setSpatialData({
              storeyName,
              fullPath: storyPath,
              storeyGuid,
              buildingGuid,
              siteGuid,
              projectGuid
            });

            console.log("✅ BIM-Daten erfolgreich gescannt:", { storeyName, storeyGuid, buildingGuid, siteGuid, projectGuid });
            alert(`✅ Basis-Geschoss erfolgreich gescannt!\nName: ${storeyName}`);
          } else {
            alert("⚠️ Keine Hierarchie für dieses Objekt gefunden.");
          }

          setIsScanning(false);

        } catch (err) {
          console.error("❌ Fehler beim Scannen:", err);
          setIsScanning(false);
        }
      }
    };

    window.addEventListener('trimble-event', handleTrimbleEvent);
    return () => window.removeEventListener('trimble-event', handleTrimbleEvent);
  }, [api]);

  return { isScanning, setIsScanning, spatialData };
}