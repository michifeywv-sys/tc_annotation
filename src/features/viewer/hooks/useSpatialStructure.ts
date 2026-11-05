import { useState, useCallback } from 'react';
import type { WorkspaceAPI } from 'trimble-connect-workspace-api';

export interface ModelInfo {
  id: string;
  name: string;
}

export interface StoreyNode {
  id: string;
  name: string;
  guid: string;
  buildingGuid: string;
  siteGuid: string;
  projectGuid: string;
  modelId: string;
  fullPath: string;
}

// Lesebrille: Sucht exakt nach dem "Common Type" (wie in deinem Screenshot!)
const getIfcType = (propData: any): string => {
  if (propData?.class) return String(propData.class).toUpperCase();
  if (!propData || !propData.properties) return '';
  for (const group of propData.properties) {
    if (!group.properties) continue;
    for (const prop of group.properties) {
      if (['Common Type', 'IfcEntity', 'Type', 'Klasse / Typ'].includes(prop.name)) {
        return String(prop.value).toUpperCase();
      }
    }
  }
  return '';
};

export function useSpatialStructure(api: WorkspaceAPI | null) {
  const [loadedModels, setLoadedModels] = useState<ModelInfo[]>([]);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  
  const [availableStoreys, setAvailableStoreys] = useState<StoreyNode[]>([]);
  const [activeStorey, setActiveStorey] = useState<StoreyNode | null>(null);

  const fetchLoadedModels = useCallback(async () => {
    if (!api || !api.viewer) return;
    try {
      const models = await api.viewer.getModels();
      const validModels = models
        .filter(m => !m.id.startsWith('zyl_'))
        .map(m => ({ id: m.id, name: m.name || m.id }));
      setLoadedModels(validModels);
    } catch (err) {
      console.error("Fehler beim Abrufen der Modelle:", err);
    }
  }, [api]);

  const extractStructureFromModels = async () => {
    if (!api || !api.viewer || selectedModelIds.length === 0) return;
    
    console.log("🚀 Starte Struktur-Extraktion (Bottom-Up + Strict Class)...");
    const foundStoreys: StoreyNode[] = [];

    for (const modelId of selectedModelIds) {
      try {
        // --- 1. WURZELN FINDEN (Der erfolgreiche Hack aus deinem Log) ---
        const getRootNodes = async (hType: number) => {
          try {
            const normalRoots = await api.viewer.getHierarchyChildren(modelId, [], hType, false);
            if (normalRoots && normalRoots.length > 0) return normalRoots;
          } catch (e) {}

          const rootsMap = new Map<number, any>();
          // Ein weit ausgeworfenes Netz an Test-IDs, falls das Modell stark fragmentiert ist
          const testIds = [0, 1, 2, 5, 10, 20, 50, 100, 500, 1000]; 
          for (const tId of testIds) {
            try {
              const parents = await api.viewer.getHierarchyParents(modelId, [tId], hType, true);
              if (parents && parents.length > 0) {
                const topNode = parents[parents.length - 1]; 
                rootsMap.set(topNode.id, topNode); // Verhindert Duplikate
              }
            } catch (e) { /* Ignorieren, wenn ID nicht existiert */ }
          }
          return Array.from(rootsMap.values());
        };

        // Typ 1 (Spatial) probieren. Wenn leer, auf Typ 2 (Containment) wechseln
        let activeHType = 1; 
        let roots = await getRootNodes(activeHType);

        if (roots.length === 0) {
          console.log(`ℹ️ Spatial (1) leer. Wechsle zu Containment (2)...`);
          activeHType = 2;
          roots = await getRootNodes(activeHType);
        }

        console.log(`✅ Gefundene Wurzeln für Typ ${activeHType}:`, roots);


        // --- 2. BAUM ABSUCHEN & STRIKT NACH KLASSE FILTERN ---
        const traverseTree = async (
          nodes: any[], 
          currentProject: string, 
          currentSite: string, 
          currentBuilding: string, 
          currentPath: string,
          depth: number
        ) => {
          if (depth > 10 || !nodes || nodes.length === 0) return; // Notbremse

          const nodeIds = nodes.map(n => n.id);
          const propsList = await api.viewer.getObjectProperties(modelId, nodeIds);
          const guids = await api.viewer.convertToObjectIds(modelId, nodeIds);

          for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const nodeClass = getIfcType(propsList[i]);
            const nodeGuid = guids && guids.length > i ? guids[i] : '';
            const nodeName = node.name || 'Unbekannt';
            
            let pGuid = currentProject;
            let sGuid = currentSite;
            let bGuid = currentBuilding;
            let newPath = currentPath ? `${currentPath} > ${nodeName}` : nodeName;

            // GUIDs einsammeln, falls wir durch Projekt/Site/Building wandern
            if (nodeClass.includes('PROJECT')) pGuid = nodeGuid;
            else if (nodeClass.includes('SITE')) sGuid = nodeGuid;
            else if (nodeClass.includes('BUILDING') && !nodeClass.includes('STOREY')) bGuid = nodeGuid;
            
            // STRIKTE PRÜFUNG: Ist es ein Geschoss (BUILDINGSTOREY)? Keine Namen mehr!
            if (nodeClass.includes('STOREY') || nodeClass.includes('LEVEL')) {
              foundStoreys.push({
                id: node.id.toString(),
                name: nodeName,
                guid: nodeGuid,
                buildingGuid: bGuid,
                siteGuid: sGuid,
                projectGuid: pGuid,
                modelId: modelId,
                fullPath: newPath
              });
              console.log(`🏢 Geschoss registriert: ${newPath} (Klasse: ${nodeClass})`);
              // WICHTIG: Wenn es ein Geschoss ist, graben wir NICHT tiefer! (Keine Wände, keine Rohre)
            } else {
              // Wenn es kein Geschoss ist (z.B. Projekt, Gebäude, oder Trimble-Ordner), graben wir tiefer
              try {
                const children = await api.viewer.getHierarchyChildren(modelId, [node.id], activeHType, false);
                if (children && children.length > 0) {
                  await traverseTree(children, pGuid, sGuid, bGuid, newPath, depth + 1);
                }
              } catch (e) { /* Ende des Astes */ }
            }
          }
        };

        // Starte die Suche!
        if (roots.length > 0) {
          await traverseTree(roots, '', '', '', '', 0);
        }

      } catch (err) {
        console.error(`❌ Fehler beim Extrahieren von Modell ${modelId}:`, err);
      }
    }

    if (foundStoreys.length > 0) {
      setAvailableStoreys(foundStoreys);
      setActiveStorey(foundStoreys[0]);
      alert(`✅ ${foundStoreys.length} Geschosse erfolgreich extrahiert!`);
    } else {
      alert("⚠️ Keine Geschosse gefunden. Bitte öffne die Konsole (F12) für Details.");
    }
  };

  return {
    loadedModels, fetchLoadedModels,
    selectedModelIds, setSelectedModelIds,
    availableStoreys, setAvailableStoreys,
    activeStorey, setActiveStorey,
    extractStructureFromModels
  };
}