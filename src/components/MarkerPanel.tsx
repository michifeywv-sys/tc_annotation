import React, { useState } from 'react';
import { ModusButton } from './ui/NativeModusComponents';
import { MarkerService } from '../services/MarkerService';

export const MarkerPanel: React.FC = () => {
  const [x, setX] = useState<number>(0);
  const [y, setY] = useState<number>(0);
  const [z, setZ] = useState<number>(0);
  const [label, setLabel] = useState<string>('');

  const handlePlaceMarker = async () => {
    if (!label) return;
    try {
      await MarkerService.addMarker(x, y, z, label);
      alert('Marker added successfully (Check console)!');
      setLabel('');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h3>3D Marker Placement</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ fontSize: '12px' }}>Coordinates</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="number"
            placeholder="X"
            value={x}
            onChange={(e) => setX(parseFloat(e.target.value) || 0)}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <input
            type="number"
            placeholder="Y"
            value={y}
            onChange={(e) => setY(parseFloat(e.target.value) || 0)}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <input
            type="number"
            placeholder="Z"
            value={z}
            onChange={(e) => setZ(parseFloat(e.target.value) || 0)}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>
        <input
          type="text"
          placeholder="Marker Label / Note"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <ModusButton buttonStyle="primary" onClick={handlePlaceMarker} disabled={!label}>
          Place Marker
        </ModusButton>
      </div>
    </div>
  );
};
