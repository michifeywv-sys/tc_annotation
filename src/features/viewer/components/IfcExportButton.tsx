// IfcExportButton.tsx
import React, { useState } from 'react';
import { IfcBuilder, MarkerObject } from '../hooks/IfcBuilder';

interface Props {
    jsonData: MarkerObject[];
}

export const IfcExportButton: React.FC<Props> = ({ jsonData }) => {
    const [isGenerating, setIsGenerating] = useState(false);

    const handleExport = () => {
        setIsGenerating(true);

        try {
            // 1. Builder instanziieren und IFC-String erzeugen
            const builder = new IfcBuilder();
            const ifcString = builder.generate(jsonData);

            // 2. Blob für den Browser-Download erstellen
            const blob = new Blob([ifcString], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);

            // 3. Virtuellen Link klicken
            const link = document.createElement('a');
            link.href = url;
            link.download = 'Basiskoerper_Modell.ifc';
            document.body.appendChild(link);
            link.click();

            // 4. Aufräumen
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Fehler beim IFC-Export:", error);
            alert("Beim Generieren der IFC-Datei ist ein Fehler aufgetreten.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <button 
            onClick={handleExport} 
            disabled={isGenerating || jsonData.length === 0}
            style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: '#007ACC', color: 'white', border: 'none', borderRadius: '4px' }}
        >
            {isGenerating ? 'Generiere IFC...' : `IFC Exportieren (${jsonData.length} Objekte)`}
        </button>
    );
};