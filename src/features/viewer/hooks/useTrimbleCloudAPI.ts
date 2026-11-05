import { useState, useCallback } from 'react';
import type { WorkspaceAPI } from 'trimble-connect-workspace-api';
import type { PlacedObject } from './useCloudSync';

export function useTrimbleCloudAPI(
  api: WorkspaceAPI, 
  placedObjects: PlacedObject[], 
  setPlacedObjects: (objs: PlacedObject[]) => void, 
  saveObjectsToCloud: (objs: PlacedObject[]) => void
) {
  const [cloudError, setCloudError] = useState<string | null>(null);

  const saveToTrimbleCloud = async () => {
    if (!api || placedObjects.length === 0) return;
    
    try {
      setCloudError(null);
      console.log("☁️ Starte Cloud-Backup über den lokalen Proxy...");

      const projectInfo = await api.project.getProject();
      const projectId = Array.isArray(projectInfo) ? projectInfo[0].id : projectInfo.id;
      
      const token = await api.extension.requestPermission('accesstoken');
      if (!token || token === 'pending' || token === 'denied') {
        throw new Error("Konnte kein gültiges Access-Token von Trimble erhalten.");
      }

      const baseUrl = "/trimble-api/tc/api/2.0"; 
      const headers = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      };

      const projRes = await fetch(`${baseUrl}/projects/${projectId}`, { headers });
      if (!projRes.ok) throw new Error("Konnte Projekt-Details nicht abrufen.");
      const projData = await projRes.json();
      const parentId = projData.rootId; 
      
      if (!parentId) throw new Error("Trimble hat keine rootId zurückgegeben.");

      const itemsRes = await fetch(`${baseUrl}/folders/${parentId}/items`, { headers });
      if (!itemsRes.ok) throw new Error("Konnte den Ordner-Inhalt nicht abrufen.");
      const items = await itemsRes.json();
      const existingFile = (items as any[]).find((item: any) => item.name === "zylinder_marker.json");

      if (existingFile) {
        await fetch(`${baseUrl}/files/${existingFile.id}`, { method: 'DELETE', headers });
      }

      const jsonString = JSON.stringify(placedObjects);
      const blob = new Blob([jsonString], { type: "application/json" });

      const initRes = await fetch(`${baseUrl}/files/fs/initiate`, {
        method: "POST",
        headers,
        body: JSON.stringify({ name: "zylinder_marker.json", parentId: parentId, parentType: "FOLDER" })
      });
      if (!initRes.ok) throw new Error("Konnte Upload bei Trimble nicht initialisieren.");
      const uploadInfo = await initRes.json();
      
      const s3Res = await fetch(uploadInfo.uploadURL, { method: "PUT", body: blob });
      if (!s3Res.ok) throw new Error("Datenübertragung in den Cloud-Speicher fehlgeschlagen.");

      const commitRes = await fetch(`${baseUrl}/files/fs/commit`, { 
        method: "POST", headers, body: JSON.stringify({ uploadId: uploadInfo.uploadId })
      });
      if (!commitRes.ok) throw new Error("Konnte Datei-Upload nicht finalisieren.");

      alert("🎉 Perfekt! Deine Zylinder wurden permanent direkt in diesem Trimble Connect Projekt gespeichert.");
    } catch (err: any) {
      console.error("❌ Cloud-Speicherfehler:", err);
      setCloudError(`Fehler beim Sichern in der Trimble Cloud: ${err.message}`);
    }
  };

  const loadFromTrimbleCloud = useCallback(async () => {
    if (!api) return;
    try {
      console.log("🔄 Scanne Trimble Cloud nach Zylinder-Backups...");
      const projectInfo = await api.project.getProject();
      const projectId = Array.isArray(projectInfo) ? projectInfo[0].id : projectInfo.id;
      
      const token = await api.extension.requestPermission('accesstoken');
      if (!token || token === 'pending' || token === 'denied') return;

      const baseUrl = "/trimble-api/tc/api/2.0"; 
      const headers = { "Authorization": `Bearer ${token}` };

      const projRes = await fetch(`${baseUrl}/projects/${projectId}`, { headers });
      if (!projRes.ok) return;
      const projData = await projRes.json();
      const parentId = projData.rootId; 
      if (!parentId) return;

      const itemsRes = await fetch(`${baseUrl}/folders/${parentId}/items`, { headers });
      if (!itemsRes.ok) return;
      const items = await itemsRes.json();
      const configFile = items.find((item: any) => item.name === "zylinder_marker.json");

      if (!configFile) return;

      const downloadRes = await fetch(`${baseUrl}/files/fs/${configFile.id}/downloadurl`, { headers });
      if (!downloadRes.ok) return;
      const downloadInfo = await downloadRes.json();
      
      const fileRes = await fetch(downloadInfo.url);
      const cloudObjects = await fileRes.json();

      if (Array.isArray(cloudObjects)) {
        setPlacedObjects(cloudObjects);
        saveObjectsToCloud(cloudObjects); 
      }
    } catch (err) {
      console.error("❌ Fehler beim Laden:", err);
    }
  }, [api, setPlacedObjects, saveObjectsToCloud]);

  return { saveToTrimbleCloud, loadFromTrimbleCloud, cloudError };
}