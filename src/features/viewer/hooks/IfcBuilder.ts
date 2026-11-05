// IfcBuilder.ts
export type ShapeType = "cylinder" | "cube" | "cone" | "pyramid" | "sphere";
// Hilfsfunktion: Quaternion in IFC-Richtungsvektoren umrechnen
function getIfcDirections(q: { x: number, y: number, z: number, w: number }) {
    // Z-Achse (Wo zeigt das Objekt oben hin?)
    const zDir = {
        x: 2 * (q.x * q.z + q.w * q.y),
        y: 2 * (q.y * q.z - q.w * q.x),
        z: 1 - 2 * (q.x * q.x + q.y * q.y)
    };

    // X-Achse (Wo zeigt das Objekt vorne hin?)
    const xDir = {
        x: 1 - 2 * (q.y * q.y + q.z * q.z),
        y: 2 * (q.x * q.y + q.w * q.z),
        z: 2 * (q.x * q.z - q.w * q.y)
    };

    return { zDir, xDir };
}
export interface MarkerObject {
    id: string;
    guid: string;
    type: ShapeType;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number; w: number };
    scale: number;
    storey: string;
}

export class IfcBuilder {
    private currentId: number = 100;
    private ifcLines: string[] = [];

    private getNextId() { return this.currentId++; }

    public generate(objects: MarkerObject[]): string {
        this.ifcLines = [];
        this.buildHeader();
        this.buildSpatialStructure(); // Projekt, Gebäude etc.
        
        objects.forEach(obj => {
            this.buildElement(obj);
        });

        this.buildFooter();
        return this.ifcLines.join("\n");
    }

    private buildHeader() {
        this.ifcLines.push(
            "ISO-10303-21;",
            "HEADER;",
            "FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'), '2;1');",
            "FILE_NAME('React_IFC_Export.ifc', '2026-06-05', (''), (''), 'V1', 'React App', '');",
            "FILE_SCHEMA(('IFC4'));",
            "ENDSEC;",
            "DATA;"
        );
    }

    private buildSpatialStructure() {
        // Stark vereinfachtes Grundgerüst für IFC
        this.ifcLines.push(
            `#1 = IFCPROJECT('1234567890', #2, 'Mein Projekt', $, $, $, $, $, #3);`,
            `#2 = IFCOWNERHISTORY(#4, #5, $, .ADDED., $, $, $, 123456789);`,
            `#3 = IFCUNITASSIGNMENT((#6, #7));`,
            `#6 = IFCSIUNIT(*, .LENGTHUNIT., $, .METRE.);`, // Wir arbeiten in Metern
            `#7 = IFCSIUNIT(*, .PLANEANGLEUNIT., $, .RADIAN.);`,
            `#10 = IFCSITE('Site_1', #2, 'Grundstück', $, $, #11, $, $, .ELEMENT., $, $, $, $, $);`,
            `#11 = IFCLOCALPLACEMENT($, #12);`,
            `#12 = IFCAXIS2PLACEMENT3D(#13, $, $);`,
            `#13 = IFCCARTESIANPOINT((0.0, 0.0, 0.0));`,
            // Verknüpfung Projekt -> Site
            `#20 = IFCRELAGGREGATES('Rel_1', #2, 'ProjectContainer', $, #1, (#10));`
        );
    }

 private buildElement(obj: MarkerObject) {
        // 1. Position (Kartesischer Punkt)
        const pointId = this.getNextId();
        this.ifcLines.push(`#${pointId} = IFCCARTESIANPOINT((${obj.position.x.toFixed(4)}, ${obj.position.y.toFixed(4)}, ${obj.position.z.toFixed(4)}));`);
        
        // 2. Rotation berechnen (Z- und X-Vektoren)
        const dirs = getIfcDirections(obj.rotation);
        
        const zDirId = this.getNextId();
        this.ifcLines.push(`#${zDirId} = IFCDIRECTION((${dirs.zDir.x.toFixed(4)}, ${dirs.zDir.y.toFixed(4)}, ${dirs.zDir.z.toFixed(4)}));`);
        
        const xDirId = this.getNextId();
        this.ifcLines.push(`#${xDirId} = IFCDIRECTION((${dirs.xDir.x.toFixed(4)}, ${dirs.xDir.y.toFixed(4)}, ${dirs.xDir.z.toFixed(4)}));`);

        // 3. Achsen-Platzierung definieren (Punkt, Z-Achse, X-Achse)
        const placementId = this.getNextId();
        this.ifcLines.push(`#${placementId} = IFCAXIS2PLACEMENT3D(#${pointId}, #${zDirId}, #${xDirId});`);
        
        // 4. Lokale Platzierung relativ zum Grundstück (Site)
        const localPlacementId = this.getNextId();
        this.ifcLines.push(`#${localPlacementId} = IFCLOCALPLACEMENT(#11, #${placementId});`);

        // 5. Geometrie (25cm = 0.25m, Radius = 0.125m)
        const geomId = this.getNextId();
        if (obj.type === "cylinder") {
            this.ifcLines.push(`#${geomId} = IFCRIGHTCIRCULARCYLINDER(#12, 0.125, 0.25);`);
        } else if (obj.type === "cube") {
            this.ifcLines.push(`#${geomId} = IFCBLOCK(#12, 0.25, 0.25, 0.25);`);
        } else if (obj.type === "sphere") {
            this.ifcLines.push(`#${geomId} = IFCSPHERE(#12, 0.125);`);
        }
        // Hier folgen später Kegel/Pyramide...

        // 6. Das eigentliche IFC-Element (Proxy als Platzhalter für generische Geometrie)
        const elementId = this.getNextId();
        this.ifcLines.push(`#${elementId} = IFCBUILDINGELEMENTPROXY('${obj.guid}', #2, '${obj.type}', $, $, #${localPlacementId}, #${geomId}, $, .USERDEFINED.);`);
    }
    private buildFooter() {
        this.ifcLines.push("ENDSEC;", "END-ISO-10303-21;");
    }
}