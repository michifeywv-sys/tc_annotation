import React, { useState, useMemo } from 'react';
import type { WorkspaceAPI } from 'trimble-connect-workspace-api';
import { ModusButton, ModusAlert } from '../../components/ui/NativeModusComponents';

interface PropertyMarkupToolProps {
  api: WorkspaceAPI;
  selectedItems: any[];
}

const COLORS = [
  { name: 'Trimble Blue', value: { r: 0, g: 0.388, b: 0.639, a: 1 } },
  { name: 'Signalrot', value: { r: 0.82, g: 0.1, b: 0.1, a: 1 } },
  { name: 'Erfolg-Grün', value: { r: 0.18, g: 0.49, b: 0.2, a: 1 } },
  { name: 'Warn-Gelb', value: { r: 1, g: 0.75, b: 0, a: 1 } },
  { name: 'Schwarz', value: { r: 0, g: 0, b: 0, a: 1 } },
];

// Auswahlmöglichkeiten für die Rundung
const DECIMAL_OPTIONS = [
  { label: 'Original', value: null },
  { label: '0', value: 0 },
  { label: '1', value: 1 },
  { label: '2', value: 2 },
  { label: '3', value: 3 }
];

export function PropertyMarkupTool({ api, selectedItems }: PropertyMarkupToolProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProps, setSelectedProps] = useState<string[]>([]);
  
  const [activeColor, setActiveColor] = useState(COLORS[0]);
  const [decimals, setDecimals] = useState<number | null>(null); // Standard: "Original"
  
  const [feedback, setFeedback] = useState<{type: 'success' | 'error' | 'warning', msg: string} | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [favoriteGroup, setFavoriteGroup] = useState<string | null>(() => {
    return localStorage.getItem('trimble_favorite_pset') || null;
  });

  // ==========================================
  // NEU: Der intelligente Rundungs-Formatierer
  // ==========================================
  const formatValue = (val: any, dec: number | null) => {
    if (dec === null || val === null || val === undefined) return String(val);
    
    const strVal = String(val).trim();
    
    // RegEx sucht nach Zahlen (auch mit Minus oder Komma/Punkt), gefolgt von optionalen Buchstaben (Einheiten wie 'mm', 'kg')
    const match = strVal.match(/^([-+]?\d+(?:[.,]\d+)?)\s*(.*)$/);
    
    if (match) {
      const numericPart = match[1].replace(',', '.'); // Wandelt Komma in Punkt für JavaScript um
      const num = parseFloat(numericPart);
      
      if (!isNaN(num)) {
        // Runden und Punkt wieder in deutsches Komma verwandeln (sieht besser aus!)
        const formattedNum = num.toFixed(dec).replace('.', ',');
        const unit = match[2] ? ` ${match[2]}` : ''; // Einheit wieder ankleben, falls vorhanden
        return `${formattedNum}${unit}`;
      }
    }
    return strVal; // Falls es purer Text war, einfach zurückgeben
  };

  const findProp = (targetObj: any, propName: string): any => {
    if (!targetObj) return undefined;
    if (Array.isArray(targetObj)) {
      for (let item of targetObj) { 
        let r = findProp(item, propName); 
        if (r !== undefined) return r; 
      }
    } else if (typeof targetObj === 'object') {
      if (targetObj.name && targetObj.name.toLowerCase() === propName.toLowerCase() && targetObj.value !== undefined) return targetObj.value;
      for (let key in targetObj) { 
        let r = findProp(targetObj[key], propName); 
        if (r !== undefined) return r;
      }
    }
    return undefined;
  };

  const groupedProperties = useMemo(() => {
    if (!selectedItems || selectedItems.length === 0) return [];
    const groupsMap = new Map<string, Set<string>>();
    selectedItems[0].propertiesGroups?.forEach((group: any) => {
      const gName = group.name || "Ohne Gruppe";
      if (!groupsMap.has(gName)) groupsMap.set(gName, new Set<string>());
      group.properties?.forEach((p: any) => { if (p.name) groupsMap.get(gName)!.add(p.name); });
    });

    let groupsArray = Array.from(groupsMap.entries()).map(([gName, props]) => ({
      groupName: gName,
      properties: Array.from(props).sort()
    })).sort((a, b) => a.groupName.localeCompare(b.groupName));

    if (favoriteGroup) {
      const favIndex = groupsArray.findIndex(g => g.groupName === favoriteGroup);
      if (favIndex > 0) { 
        const favObj = groupsArray.splice(favIndex, 1)[0];
        groupsArray.unshift(favObj); 
      }
    }
    return groupsArray;
  }, [selectedItems, favoriteGroup]);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => prev.includes(groupName) ? prev.filter(g => g !== groupName) : [...prev, groupName]);
  };

  const toggleFavorite = (e: React.MouseEvent, groupName: string) => {
    e.stopPropagation(); 
    const newFav = favoriteGroup === groupName ? null : groupName;
    setFavoriteGroup(newFav);
    if (newFav) localStorage.setItem('trimble_favorite_pset', newFav);
    else localStorage.removeItem('trimble_favorite_pset');
  };

  const toggleProperty = (groupName: string, propName: string) => {
    const key = `${groupName}|${propName}`;
    setSelectedProps(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleCreateMarkup = async () => {
    setFeedback(null);
    if (!api.markup) return;
    if (selectedProps.length === 0) {
      setFeedback({ type: 'error', msg: "Bitte wähle Eigenschaften aus." });
      return;
    }

    try {
      const newMarkups: any[] = [];
      let missingCenterCount = 0;

      for (const item of selectedItems) {
        let cx = 0, cy = 0, cz = 0;
        let foundCenter = false;

        const pLines: string[] = [];
        item.propertiesGroups?.forEach((group: any) => {
          const gName = group.name || "Ohne Gruppe";
          group.properties?.forEach((p: any) => {
            if (selectedProps.includes(`${gName}|${p.name}`)) {
              // HIER wenden wir unsere neue Rundungs-Funktion an!
              pLines.push(`${p.name}: ${formatValue(p.value, decimals)}`);
            }
          });
        });

        const rawOX = findProp(item.propertiesGroups, "OX");
        const rawOY = findProp(item.propertiesGroups, "OY");
        const rawOZ = findProp(item.propertiesGroups, "OZ");
        const rawCoGX = findProp(item.propertiesGroups, "CenterOfGravityX");
        const rawCoGY = findProp(item.propertiesGroups, "CenterOfGravityY");
        const rawCoGZ = findProp(item.propertiesGroups, "CenterOfGravityZ");

        if (rawOX !== undefined && rawOY !== undefined && rawOZ !== undefined) {
          cx = parseFloat(rawOX); cy = parseFloat(rawOY); cz = parseFloat(rawOZ);
          foundCenter = true;
        } else if (rawCoGX !== undefined && rawCoGY !== undefined && rawCoGZ !== undefined) {
          cx = parseFloat(rawCoGX); cy = parseFloat(rawCoGY); cz = parseFloat(rawCoGZ);
          foundCenter = true;
        }

        if (pLines.length === 0) continue;
        if (!foundCenter) missingCenterCount++;

        newMarkups.push({
          text: pLines.join('\n'),
          color: activeColor.value,
          start: { positionX: cx, positionY: cy, positionZ: cz + 300 },
          end: { positionX: cx, positionY: cy, positionZ: cz }
        });
      }

      if (newMarkups.length > 0) {
        await api.markup.addTextMarkup(newMarkups);
        setFeedback({ type: 'success', msg: `${newMarkups.length} Marker gesetzt!` });
      }
    } catch (error) {
      setFeedback({ type: 'error', msg: "Fehler beim Setzen des Markers." });
    }
  };

  if (!selectedItems || selectedItems.length === 0) return null;

  return (
    <div style={{ marginBottom: '20px', border: '1px solid #0063a3', borderRadius: '4px' }}>
      <div 
        style={{ padding: '10px', backgroundColor: '#e6f0f9', cursor: 'pointer', fontWeight: 'bold', color: '#0063a3' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        🖍️ Bauteilbeschrifter {isOpen ? '▲' : '▼'}
      </div>
      
      {isOpen && (
        <div style={{ padding: '15px', backgroundColor: '#fff' }}>
          
          {/* OBERE LEISTE: FARBE & RUNDUNG */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginBottom: '15px' }}>
            
            {/* Farb-Auswahl */}
            <div style={{ flex: '1 1 auto' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>Markierungsfarbe:</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {COLORS.map(color => (
                  <div 
                    key={color.name} onClick={() => setActiveColor(color)} title={color.name}
                    style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      backgroundColor: `rgba(${color.value.r * 255}, ${color.value.g * 255}, ${color.value.b * 255}, 1)`,
                      border: activeColor.name === color.name ? '3px solid #333' : '1px solid #ccc',
                      cursor: 'pointer',
                      boxShadow: activeColor.name === color.name ? '0 0 5px rgba(0,0,0,0.3)' : 'none'
                    }}
                  />
                ))}
              </div>
            </div>

            {/* NEU: Kommastellen-Auswahl */}
            <div style={{ flex: '1 1 auto' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>Kommastellen:</div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {DECIMAL_OPTIONS.map(opt => (
                  <div 
                    key={opt.label} 
                    onClick={() => setDecimals(opt.value)}
                    style={{
                      padding: '4px 8px', fontSize: '11px', cursor: 'pointer', borderRadius: '4px',
                      border: decimals === opt.value ? '2px solid #333' : '1px solid #ccc',
                      backgroundColor: decimals === opt.value ? '#eee' : '#fff',
                      fontWeight: decimals === opt.value ? 'bold' : 'normal',
                      userSelect: 'none'
                    }}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* GRUPPIERTE PSETS MIT AKKORDEON & FAVORITEN */}
          <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #eee', padding: '5px', marginBottom: '15px', backgroundColor: '#fafafa' }}>
            {groupedProperties.map(group => {
              const isExpanded = expandedGroups.includes(group.groupName);
              const isFavorite = favoriteGroup === group.groupName;

              return (
                <div key={group.groupName} style={{ marginBottom: '5px', border: '1px solid #e0e0e0', borderRadius: '4px', backgroundColor: '#fff' }}>
                  <div 
                    onClick={() => toggleGroup(group.groupName)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', backgroundColor: isFavorite ? '#fffde7' : '#f5f5f5', cursor: 'pointer' }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#333', userSelect: 'none' }}>
                      <span style={{ display: 'inline-block', width: '15px', color: '#666' }}>{isExpanded ? '▼' : '▶'}</span>
                      {group.groupName}
                    </div>
                    <div 
                      onClick={(e) => toggleFavorite(e, group.groupName)} title="Als Favorit markieren"
                      style={{ fontSize: '16px', color: isFavorite ? '#fbc02d' : '#ddd', cursor: 'pointer', padding: '0 5px' }}
                    >
                      {isFavorite ? '★' : '☆'}
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ padding: '8px 8px 8px 25px', borderTop: '1px solid #eee' }}>
                      {group.properties.map(prop => {
                        const key = `${group.groupName}|${prop}`;
                        return (
                          <label key={key} style={{ display: 'block', fontSize: '12px', marginBottom: '4px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={selectedProps.includes(key)} onChange={() => toggleProperty(group.groupName, prop)} style={{ marginRight: '6px' }} />
                            {prop}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <ModusButton color="primary" onClick={handleCreateMarkup} style={{ width: '100%' }}>
            Marker in 3D setzen
          </ModusButton>

          {feedback && <div style={{ marginTop: '10px' }}><ModusAlert type={feedback.type} message={feedback.msg} /></div>}
        </div>
      )}
    </div>
  );
}