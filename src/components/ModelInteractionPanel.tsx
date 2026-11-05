import React, { useState, useEffect, useCallback } from 'react';
import { ModusButton, ModusCard, ModusAlert } from './ui/NativeModusComponents';
import { TrimbleConnectService } from '../services/TrimbleConnectService';

export const ModelInteractionPanel: React.FC = () => {
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSelectionData = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const selection = await TrimbleConnectService.getSelection();

      if (!selection || selection.length === 0) {
        setSelectedItems([]);
        return;
      }

      const itemsData = [];

      for (const modelSelection of selection) {
        const modelId = modelSelection.modelId;
        const runtimeIds = modelSelection.objectRuntimeIds;

        if (!runtimeIds || runtimeIds.length === 0) continue;

        // Convert Object IDs to real GUIDs
        const guids = await TrimbleConnectService.convertToObjectIds(modelId, runtimeIds);
        
        // Fetch properties
        const propertiesList = await TrimbleConnectService.getObjectProperties(modelId, runtimeIds);

        for (let i = 0; i < runtimeIds.length; i++) {
          itemsData.push({
            runtimeId: runtimeIds[i],
            modelId,
            guid: guids ? guids[i] : 'No GUID found',
            propertiesGroups: propertiesList && propertiesList[i] ? propertiesList[i].properties : []
          });
        }
      }

      setSelectedItems(itemsData);
    } catch (err) {
      console.error('Error fetching selection data:', err);
      setError('Error loading object data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check initial selection
    fetchSelectionData();

    // Listen to Trimble custom events
    const handleTrimbleEvent = (e: any) => {
      if (e.detail && e.detail.event === 'viewer.onSelectionChanged') {
        fetchSelectionData();
      }
    };

    window.addEventListener('trimble-event', handleTrimbleEvent);
    return () => window.removeEventListener('trimble-event', handleTrimbleEvent);
  }, [fetchSelectionData]);

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h2 style={{ margin: 0, color: '#0063a3' }}>Live Bauteil-Inspektor</h2>
      <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
        Click on one or more objects in the 3D model.
      </p>

      {error && <ModusAlert type="error" message={error} />}

      {selectedItems.length === 0 && !error && (
        <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#f9f9f9', border: '1px dashed #ccc' }}>
          {loading ? 'Loading object details...' : 'Please select objects in the 3D viewer.'}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {selectedItems.map((item, index) => (
          <div key={`${item.runtimeId}-${index}`} style={{ border: '1px solid #0063a3', borderRadius: '4px', overflow: 'hidden' }}>
            {/* Header with GUID */}
            <div style={{ backgroundColor: '#e6f0f9', padding: '10px', borderBottom: '1px solid #0063a3' }}>
              <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase' }}>
                Object #{item.runtimeId} | IFC GUID:
              </div>
              <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#0063a3', wordBreak: 'break-all' }}>
                {item.guid}
              </div>
            </div>

            {/* Properties List */}
            <div style={{ padding: '10px', maxHeight: '250px', overflowY: 'auto' }}>
              {item.propertiesGroups && item.propertiesGroups.length > 0 ? (
                item.propertiesGroups.map((group: any, gIdx: number) => (
                  <div key={gIdx} style={{ marginBottom: '12px' }}>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '12px', borderBottom: '1px solid #eee', color: '#333' }}>
                      {group.name}
                    </h4>
                    <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                      <tbody>
                        {group.properties && group.properties.map((prop: any, pIdx: number) => (
                          <tr key={pIdx}>
                            <td style={{ width: '40%', padding: '2px 0', color: '#666' }}>{prop.name}:</td>
                            <td style={{ padding: '2px 0', wordBreak: 'break-word' }}>{String(prop.value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '11px', color: '#999' }}>No properties found.</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
