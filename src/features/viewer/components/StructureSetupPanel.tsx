import React, { useEffect } from 'react';
import { ModusButton } from '../../../components/ui/NativeModusComponents';

interface StructureSetupPanelProps {
  loadedModels: { id: string; name: string }[];
  selectedModelIds: string[];
  setSelectedModelIds: (ids: string[]) => void;
  onRefreshModels: () => void;
  onExtractStructure: () => void;
  // NEU: Für das Dropdown
  availableStoreys: any[];
  activeStorey: any;
  setActiveStorey: (storey: any) => void;
}

export function StructureSetupPanel({
  loadedModels,
  selectedModelIds,
  setSelectedModelIds,
  onRefreshModels,
  onExtractStructure,
  availableStoreys, activeStorey, setActiveStorey // NEU
}: StructureSetupPanelProps) {
  
  // Initiales Laden der Modelle anstoßen
  useEffect(() => {
    onRefreshModels();
  }, [onRefreshModels]);

  const toggleModelSelection = (id: string) => {
    if (selectedModelIds.includes(id)) {
      setSelectedModelIds(selectedModelIds.filter(mId => mId !== id));
    } else {
      setSelectedModelIds([...selectedModelIds, id]);
    }
  };

  return (
    <div style={{ backgroundColor: '#fff3e0', padding: '15px', borderRadius: '4px', marginBottom: '20px', border: '1px solid #ffb74d' }}>
      <h3 style={{ marginTop: 0, fontSize: '16px', color: '#e65100' }}>🏗️ 1. Projektstruktur festlegen</h3>
      <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
        Wähle die IFC-Modelle aus, aus denen die Gebäude- und Geschossstruktur gelesen werden soll.
      </p>

      <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #ccc', padding: '10px', backgroundColor: '#fff', marginBottom: '10px' }}>
        {loadedModels.length === 0 ? (
          <div style={{ fontSize: '12px', color: '#999' }}>Keine IFC-Modelle im Viewer gefunden.</div>
        ) : (
          loadedModels.map(model => (
            <label key={model.id} style={{ display: 'block', fontSize: '13px', marginBottom: '5px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={selectedModelIds.includes(model.id)}
                onChange={() => toggleModelSelection(model.id)}
                style={{ marginRight: '8px' }}
              />
              {model.name}
            </label>
          ))
        )}
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <ModusButton color="secondary" onClick={onRefreshModels}>🔄 Modelle neu laden</ModusButton>
        <ModusButton color="primary" onClick={onExtractStructure} disabled={selectedModelIds.length === 0}>
          📑 Struktur & Geschosse auslesen
        </ModusButton>
      </div>
    {/* NEU: DAS DROPDOWN FÜR DAS AKTIVE GESCHOSS */}
      {availableStoreys.length > 0 && (
        <div style={{ padding: '15px', backgroundColor: '#fff', border: '1px solid #ffb74d', borderRadius: '4px' }}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '5px', color: '#333' }}>
            🎯 Aktives Ziel-Geschoss (Für neue Zylinder):
          </div>
          <select 
            value={activeStorey?.guid || ''}
            onChange={(e) => setActiveStorey(availableStoreys.find(s => s.guid === e.target.value) || null)}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px' }}
          >
            {availableStoreys.map(s => (
              <option key={s.guid} value={s.guid}>{s.fullPath}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}