import React from 'react';
import { ModusButton } from '../../../components/ui/NativeModusComponents';

interface ObjectManagerPanelProps {
  isPlacementMode: boolean;
  setIsPlacementMode: (val: boolean) => void;
  placedObjectsCount: number;
  onClearAll: () => void;
  onSaveToCloud: () => void;
  isScanning: boolean;
  setIsScanning: (val: boolean) => void;
  spatialData?: { fullPath?: string } | null; 
  onActivatePointTool: () => void;
  onSavePointsToBackend: () => void;
  onResetTool: () => void;
}

export function ObjectManagerPanel({
  isPlacementMode,
  setIsPlacementMode,
  placedObjectsCount,
  onClearAll,
  onSaveToCloud,
  isScanning,
  setIsScanning,
  spatialData,
  onActivatePointTool,
  onSavePointsToBackend,
  onResetTool
}: ObjectManagerPanelProps) {
  return (
    <div style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '4px', marginBottom: '20px', border: '1px solid #ddd' }}>
      <h3 style={{ marginTop: 0, fontSize: '16px', color: '#0063a3' }}>📦 Objekt-Manager (3D Zylinder)</h3>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
        
        {/* BUTTON 1: ZYLINDER PLATZIEREN */}
        <ModusButton 
          color={isPlacementMode ? "danger" : "primary"}
          onClick={() => setIsPlacementMode(!isPlacementMode)}
        >
          {isPlacementMode ? "🛑 Platzieren BEENDEN" : "📍 Zylinder Platzieren STARTEN"}
        </ModusButton>
        
        {/* BUTTON 2: ALLE LÖSCHEN */}
        <ModusButton color="secondary" onClick={onClearAll}>
          🗑️ Alle löschen
        </ModusButton>

        {/* BUTTON 3: IN CLOUD SPEICHERN */}
        <ModusButton 
          color="primary"
          onClick={onSaveToCloud}
          disabled={placedObjectsCount === 0}
        >
          ☁️ In Trimble Cloud sichern
        </ModusButton>

        {/* BUTTON 4: GESCHOSS SCANNEN */}
        <ModusButton 
          color={isScanning ? "danger" : "secondary"}
          onClick={() => setIsScanning(!isScanning)}
        >
          {isScanning ? "🛑 Scannen abbrechen" : "1️⃣ Basis-Geschoss scannen"}
        </ModusButton>

        {/* BUTTON 5: POINT MARKUP TOOL */}
        <ModusButton color="primary" onClick={onActivatePointTool}>
          📍 Point-Tool aktivieren
        </ModusButton>

        {/* BUTTON 6: PUNKTE AN BACKEND SENDEN */}
        <ModusButton color="secondary" onClick={onSavePointsToBackend}>
          💾 Punkte an Java-Backend senden
        </ModusButton>

        {/* BUTTON 7: WERKZEUG ZURÜCKSETZEN */}
        <ModusButton color="danger" onClick={onResetTool}>
          🔄 Tool zurücksetzen
        </ModusButton>

      </div>

      <div style={{ fontSize: '12px', color: '#666' }}>
        Aktuelle Zylinder im Modell: <strong>{placedObjectsCount}</strong><br/>
        <em>Status: {isPlacementMode ? "🟢 Klicke auf ein Bauteil im Modell!" : "⚪ Warten..."}</em>
      </div>

      {/* ANZEIGE DES GESCANNTEN GESCHOSSES */}
      {spatialData?.fullPath && (
        <div style={{ marginTop: '15px', fontSize: '13px', backgroundColor: '#e6f0f9', padding: '10px', borderRadius: '4px', border: '1px solid #0063a3' }}>
          <strong>📍 Gescanntes Basis-Geschoss:</strong><br/>
          {spatialData.fullPath}
        </div>
      )}
    </div>
  );
}