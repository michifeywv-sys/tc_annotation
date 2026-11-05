import React from 'react';

interface PropertyInspectorPanelProps {
  selectedItems: any[];
  onSelectProperty: (prop: { name: string; value: string }) => void;
  selectedProperty: { name: string; value: string } | null;
}

export function PropertyInspectorPanel({
  selectedItems,
  onSelectProperty,
  selectedProperty
}: PropertyInspectorPanelProps) {
  if (selectedItems.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#f9f9f9', border: '1px dashed #ccc' }}>
        Bitte wähle Bauteile im Viewer aus.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {selectedItems.map((item, index) => (
        <div key={`${item.runtimeId}-${index}`} style={{ border: '1px solid #0063a3', borderRadius: '4px', overflow: 'hidden' }}>
          
          <div style={{ backgroundColor: '#e6f0f9', padding: '10px', borderBottom: '1px solid #0063a3' }}>
            <div style={{ fontSize: '12px', color: '#555', textTransform: 'uppercase' }}>{item.runtimeId} | IFC GUID:</div>
            <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#0063a3', wordBreak: 'break-all' }}>
              {item.guid}
            </div>
          </div>

          <div style={{ padding: '10px', maxHeight: '300px', overflowY: 'auto' }}>
            {item.propertiesGroups && item.propertiesGroups.length > 0 ? (
              item.propertiesGroups.map((group: any, gIdx: number) => (
                <div key={gIdx} style={{ marginBottom: '15px' }}>
                  <h4 style={{ margin: '0 0 5px 0', fontSize: '13px', borderBottom: '1px solid #eee' }}>{group.name}</h4>
                  <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                    <tbody>
                      {group.properties && group.properties.map((prop: any, pIdx: number) => {
                        const isSelected = selectedProperty && selectedProperty.name === prop.name && selectedProperty.value === String(prop.value);
                        return (
                          <tr key={pIdx} style={{ backgroundColor: isSelected ? '#fffde7' : 'transparent' }}>
                            <td style={{ width: '40%', padding: '4px 0', color: '#666' }}>{prop.name}:</td>
                            <td style={{ padding: '4px 0', wordBreak: 'break-word' }}>{String(prop.value)}</td>
                            <td style={{ width: '60px', padding: '4px 0', textAlign: 'right' }}>
                              <button
                                onClick={() => onSelectProperty({ name: prop.name, value: String(prop.value) })}
                                style={{
                                  cursor: 'pointer',
                                  fontSize: '10px',
                                  backgroundColor: isSelected ? '#0063a3' : '#e6f0f9',
                                  color: isSelected ? '#fff' : '#0063a3',
                                  border: '1px solid #0063a3',
                                  borderRadius: '3px',
                                  padding: '2px 6px'
                                }}
                              >
                                {isSelected ? 'Selected' : 'Use'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))
            ) : (
              <div style={{ fontSize: '12px', color: '#999' }}>Keine Eigenschaften vorhanden.</div>
            )}
          </div>
          
        </div>
      ))}
    </div>
  );
}