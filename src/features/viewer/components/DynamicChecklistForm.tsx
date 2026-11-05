import React from 'react';
import { type ParsedTemplateItem, getValueTypeLabel } from '../utils/checklistParser';

interface DynamicChecklistFormProps {
  items: ParsedTemplateItem[];
  onChangeItem: (templateItemId: number, updatedFields: Partial<ParsedTemplateItem>) => void;
  onBatchPopulate?: (status: 'Pass' | 'NA' | 'Reset' | 'DateToday') => void;
}

export const DynamicChecklistForm: React.FC<DynamicChecklistFormProps> = ({
  items,
  onChangeItem,
  onBatchPopulate
}) => {
  if (!items || items.length === 0) {
    return (
      <div style={{ padding: '16px', backgroundColor: '#f8fafc', border: '1px border-dashed #cbd5e1', borderRadius: '6px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
        Keine Vorlagen-Felder für diese Checkliste geladen.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* BATCH POPULATE / PRE-FILL TOOLBAR */}
      {onBatchPopulate && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', backgroundColor: '#f1f5f9', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', marginRight: '4px' }}>⚡ Batch-Vorausfüllen:</span>
          <button
            type="button"
            onClick={() => onBatchPopulate('Pass')}
            style={{ padding: '3px 8px', fontSize: '11px', backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ✅ Alle Ja / Pass
          </button>
          <button
            type="button"
            onClick={() => onBatchPopulate('NA')}
            style={{ padding: '3px 8px', fontSize: '11px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ➖ Alle N/A
          </button>
          <button
            type="button"
            onClick={() => onBatchPopulate('DateToday')}
            style={{ padding: '3px 8px', fontSize: '11px', backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            🕒 Datum heute
          </button>
          <button
            type="button"
            onClick={() => onBatchPopulate('Reset')}
            style={{ padding: '3px 8px', fontSize: '11px', backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '4px', cursor: 'pointer' }}
          >
            🧹 Leeren
          </button>
        </div>
      )}

      {/* RENDER EACH DYNAMIC ITEM */}
      {items.map((item) => {
        const isHeader = item.ValueType === 11;
        const isTitleReadOnly = item.ValueType === 8;
        const isTextInput = item.ValueType === 9;
        const isBoolean = item.ValueType === 10 || item.IncludeYesNoNA;
        const isDate = item.ValueType === 3;
        const isSignatureReadOnly = item.ValueType === 13;
        const isDropdown = item.ValueType === 4;

        // 1. HEADER / SECTION DIVIDER (ValueType 11)
        if (isHeader) {
          return (
            <div
              key={item.TemplateItemID}
              style={{
                marginTop: '12px',
                marginBottom: '4px',
                padding: '6px 10px',
                backgroundColor: '#0063a3',
                color: '#ffffff',
                borderRadius: '4px',
                fontWeight: 'bold',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>📌</span> {item.Description}
            </div>
          );
        }

        // 2. TITLE / READ ONLY FIELD (ValueType 8)
        if (isTitleReadOnly) {
          return (
            <div
              key={item.TemplateItemID}
              style={{
                padding: '8px 12px',
                backgroundColor: '#f8fafc',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                display: 'flex',
                justify: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px' }}>🔒</span>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>
                    {item.Description}
                  </div>
                  {item.Value && (
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      {item.Value}
                    </div>
                  )}
                </div>
              </div>
              <span style={{ fontSize: '10px', backgroundColor: '#e2e8f0', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                Titel (Read-Only)
              </span>
            </div>
          );
        }

        return (
          <div
            key={item.TemplateItemID}
            style={{
              padding: '10px 12px',
              backgroundColor: '#ffffff',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}
          >
            {/* ITEM METADATA HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e293b' }}>
                {item.Description}
              </label>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', backgroundColor: '#f1f5f9', color: '#64748b', padding: '2px 6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                  ID: {item.TemplateItemID}
                </span>
                <span style={{ fontSize: '10px', backgroundColor: '#e2e8f0', color: '#334155', padding: '2px 6px', borderRadius: '4px' }}>
                  {getValueTypeLabel(item.ValueType)}
                </span>
              </div>
            </div>

            {/* DYNAMIC FIELD RENDER BY VALUE TYPE */}

            {/* A. BOOLEAN (ValueType 10 or IncludeYesNoNA) */}
            {isBoolean && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => onChangeItem(item.TemplateItemID, { Status: 'Pass', Value: 'Ja' })}
                    style={{
                      flex: 1,
                      padding: '6px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      borderRadius: '4px',
                      border: '1px solid',
                      borderColor: item.Status === 'Pass' || item.Value === 'Ja' ? '#166534' : '#cbd5e1',
                      backgroundColor: item.Status === 'Pass' || item.Value === 'Ja' ? '#dcfce7' : '#ffffff',
                      color: item.Status === 'Pass' || item.Value === 'Ja' ? '#166534' : '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    ✅ Ja / Pass
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeItem(item.TemplateItemID, { Status: 'Fail', Value: 'Nein' })}
                    style={{
                      flex: 1,
                      padding: '6px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      borderRadius: '4px',
                      border: '1px solid',
                      borderColor: item.Status === 'Fail' || item.Value === 'Nein' ? '#991b1b' : '#cbd5e1',
                      backgroundColor: item.Status === 'Fail' || item.Value === 'Nein' ? '#fee2e2' : '#ffffff',
                      color: item.Status === 'Fail' || item.Value === 'Nein' ? '#991b1b' : '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    ❌ Nein / Fail
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeItem(item.TemplateItemID, { Status: 'NA', Value: 'N/A' })}
                    style={{
                      flex: 1,
                      padding: '6px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      borderRadius: '4px',
                      border: '1px solid',
                      borderColor: item.Status === 'NA' || item.Value === 'N/A' ? '#475569' : '#cbd5e1',
                      backgroundColor: item.Status === 'NA' || item.Value === 'N/A' ? '#e2e8f0' : '#ffffff',
                      color: item.Status === 'NA' || item.Value === 'N/A' ? '#0f172a' : '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    ➖ N/A
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Bemerkung / Notiz (Optional)"
                  value={item.Comments || ''}
                  onChange={(e) => onChangeItem(item.TemplateItemID, { Comments: e.target.value })}
                  style={{ width: '100%', padding: '5px 8px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>
            )}

            {/* B. DATE / TIME (ValueType 3) */}
            {isDate && (
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' }}>
                <input
                  type="datetime-local"
                  value={item.Value || ''}
                  onChange={(e) => onChangeItem(item.TemplateItemID, { Value: e.target.value })}
                  style={{ flex: 1, padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
                <button
                  type="button"
                  onClick={() => onChangeItem(item.TemplateItemID, { Value: new Date().toISOString().slice(0, 16) })}
                  style={{ padding: '6px 10px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '4px', cursor: 'pointer' }}
                >
                  🕒 Jetzt
                </button>
              </div>
            )}

            {/* C. SIGNATURE READ ONLY (ValueType 13) */}
            {isSignatureReadOnly && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px', backgroundColor: '#fafafa', padding: '8px', borderRadius: '4px', border: '1px border-dashed #d1d5db' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px' }}>✍️ 🔒</span>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#6b7280' }}>Unterschrift (Read-Only):</span>
                </div>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={item.Value || 'Signatur aus System-Benutzer / Vorlage'}
                  style={{ width: '100%', padding: '6px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #e5e7eb', backgroundColor: '#f3f4f6', color: '#4b5563', boxSizing: 'border-box' }}
                />
              </div>
            )}

            {/* D. DROPDOWN (ValueType 4) */}
            {isDropdown && (
              <input
                type="text"
                placeholder="Auswahl oder Wert eingeben..."
                value={item.Value || ''}
                onChange={(e) => onChangeItem(item.TemplateItemID, { Value: e.target.value })}
                style={{ width: '100%', padding: '6px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box', marginTop: '4px' }}
              />
            )}

            {/* E. TEXT INPUT (ValueType 9 or default text) */}
            {(isTextInput || (!isBoolean && !isDate && !isSignatureReadOnly && !isDropdown)) && (
              <input
                type="text"
                placeholder="Text eingeben..."
                value={item.Value || ''}
                onChange={(e) => onChangeItem(item.TemplateItemID, { Value: e.target.value })}
                style={{ width: '100%', padding: '6px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box', marginTop: '4px' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
