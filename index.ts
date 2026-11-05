import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';

// Lädt deine 8 Variablen aus der .env Datei
dotenv.config();

// Schaltet für unsere lokalen Tests die SSL-Prüfung aus (wichtig im Firmen-Netzwerk!)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const app = express();
app.use(express.json());
const port = process.env.PORT || 3000;

let psOAuthAccessToken = '';
let connectViewerToken = '';

// 1. Startseite mit Login
app.get('/', (req: Request, res: Response) => {
    res.send('<h1>ProjectSight API Test</h1><a href="/login" style="font-size: 20px; color: #0063a3; font-weight: bold;">🔑 Login mit Trimble</a>');
});

// 2. Weiterleitung zur Trimble-Anmeldeseite
app.get('/login', (req: Request, res: Response) => {
    const authUrl = new URL(process.env.AUTH_URL!.trim());
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', process.env.CLIENT_ID!.trim());
    authUrl.searchParams.append('redirect_uri', process.env.REDIRECT_URI!.trim());
    authUrl.searchParams.append('scope', process.env.SCOPE!.trim());

    res.redirect(authUrl.toString());
});

// 3. Callback abfangen und Token holen
app.get('/callback', async (req: Request, res: Response) => {
    const code = req.query.code as string;
    if (!code) return res.status(400).send('Kein Authorization Code erhalten.');

    try {
        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('code', code);
        params.append('redirect_uri', process.env.REDIRECT_URI!.trim());
        params.append('client_id', process.env.CLIENT_ID!.trim());
        params.append('client_secret', process.env.CLIENT_SECRET!.trim());

        const response = await fetch(process.env.TOKEN_URL!.trim(), {
            method: 'POST',
            body: params,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const data = await response.json();
        if (!response.ok) throw new Error(JSON.stringify(data));

        psOAuthAccessToken = data.access_token;
        console.log('✅ ProjectSight OAuth Token via Login generiert.');
        res.send(`
            <div style="font-family: sans-serif; padding: 20px;">
                <h2 style="color: green;">Erfolg!</h2>
                <p>ProjectSight Access Token wurde generiert.</p>
                <a href="/dashboard" style="display: inline-block; padding: 10px 15px; background: #0063a3; color: white; text-decoration: none; border-radius: 4px;">🚀 Ab ins Dashboard zur Projekt-Auswahl</a>
            </div>
        `);
    } catch (error: any) {
        console.error('Fehler beim Token-Abruf:', error.message || error);
        res.status(500).send('Fehler beim Abrufen des Tokens. Siehe Terminal.');
    }
});

// Helper to get active token from Authorization header or memory
function getAuthToken(req: Request): string {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const hToken = authHeader.substring(7).trim();
        if (hToken) return hToken;
    }
    return psOAuthAccessToken ? psOAuthAccessToken.trim() : (connectViewerToken ? connectViewerToken.trim() : '');
}

// Token von Frontend-App setzen (Trimble Connect Extension Token)
app.post('/api/token', (req: Request, res: Response) => {
    const { token } = req.body || {};
    if (token && typeof token === 'string') {
        connectViewerToken = token.trim();
        console.log('🔑 Connect Extension Token via Frontend API aktualisiert.');
        return res.json({ success: true, message: 'Token aktualisiert' });
    }
    res.status(400).json({ error: 'Kein gültiger Token übergeben' });
});


// 4. API-Endpunkt für Portfolios (wird vom Dashboard aufgerufen)
app.get('/api/portfolios', async (req: Request, res: Response) => {
    const token = getAuthToken(req);
    if (!token) return res.status(401).json({ error: 'Nicht eingeloggt', message: 'Kein Access Token vorhanden.' });

    const cleanToken = String(token).replace(/[^a-zA-Z0-9\-._~+/=]/g, "");
    const cleanUrl = String(process.env.BASE_URL).replace(/[^a-zA-Z0-9\-._~:/?=]/g, "");

    try {
        const response = await fetch(`${cleanUrl}/portfolios`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${cleanToken}`,
                'Accept': 'application/json'
            }
        });
        const data = await response.json();
        if (!response.ok || (data && data.fault)) {
            console.error("❌ Portfolios API Fehler:", data);
            return res.status(response.status >= 400 ? response.status : 401).json(data);
        }
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// 5. API-Endpunkt für Projekte eines Portfolios (wird vom Dashboard aufgerufen)
app.get('/api/projects/:portfolioId', async (req: Request, res: Response) => {
    const token = getAuthToken(req);
    if (!token) return res.status(401).json({ error: 'Nicht eingeloggt', message: 'Kein Access Token vorhanden.' });

    const cleanToken = String(token).replace(/[^a-zA-Z0-9\-._~+/=]/g, "");
    const cleanUrl = String(process.env.BASE_URL).replace(/[^a-zA-Z0-9\-._~:/?=]/g, "");
    const portfolioId = req.params.portfolioId;

    try {
        const response = await fetch(`${cleanUrl}/${portfolioId}/projects`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${cleanToken}`,
                'Accept': 'application/json'
            }
        });
        const data = await response.json();
        if (!response.ok || (data && data.fault)) {
            console.error("❌ Projects API Fehler:", data);
            return res.status(response.status >= 400 ? response.status : 401).json(data);
        }
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});
// --- NEUE ENDPUNKTE FÜR SCHRITT 4 ---

// 6. Workflow States abrufen
app.get('/api/workflowstates/:portfolioId/:projectId', async (req: Request, res: Response) => {
    const token = getAuthToken(req);
    if (!token) return res.status(401).json({ error: 'Nicht eingeloggt', message: 'Kein Access Token vorhanden.' });
    const { portfolioId, projectId } = req.params;
    const cleanToken = String(token).replace(/[^a-zA-Z0-9\-._~+/=]/g, "");
    const cleanUrl = String(process.env.BASE_URL).replace(/[^a-zA-Z0-9\-._~:/?=]/g, "");

    try {
        const response = await fetch(`${cleanUrl}/${portfolioId}/${projectId}/checklists/workflowstates`, {
            headers: { 'Authorization': `Bearer ${cleanToken}`, 'Accept': 'application/json' }
        });
        const data = await response.json();
        if (!response.ok || (data && data.fault)) {
            return res.status(response.status >= 400 ? response.status : 401).json(data);
        }
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// 7. Vorlagen-Namen intelligent aus der WorkDescription von Entwürfen auslesen
app.get('/api/templates/:portfolioId/:projectId', async (req: Request, res: Response) => {
    const token = getAuthToken(req);
    if (!token) return res.status(401).json({ error: 'Nicht eingeloggt', message: 'Kein Access Token vorhanden.' });
    const { portfolioId, projectId } = req.params;
    const cleanToken = String(token).replace(/[^a-zA-Z0-9\-._~+/=]/g, "");
    const cleanUrl = String(process.env.BASE_URL).replace(/[^a-zA-Z0-9\-._~:/?=]/g, "");

    try {
        // Wir rufen die Standard-Liste ab (die WorkDescription ist dort bereits enthalten!)
        const response = await fetch(`${cleanUrl}/${portfolioId}/${projectId}/checklists/list`, {
            headers: { 
                'Authorization': `Bearer ${cleanToken}`, 
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            return res.status(response.status).json({ error: `API Fehler: ${response.status}` });
        }

        const data = await response.json();
        const checklists = Array.isArray(data) ? data : (data.items || []);

        console.log(`\n--- 📋 LESE VORLAGEN AUS ${checklists.length} CHECKLISTEN (FOKUS AUF WORKDESCRIPTION) ---`);

        const uniqueTemplates = new Map();

        // STUFE 1: Wir durchsuchen ZUERST gezielt alle Entwürfe nach einer WorkDescription!
        checklists.forEach((cl: any) => {
            const isDraft = (cl.WorkflowState === 1 || cl.IsDraft === true || cl.WorkflowStateName === 'Entwurf');
            const tempId = cl.TemplateID;
            const workDesc = cl.WorkDescription ? String(cl.WorkDescription).trim() : '';

            // Wenn es ein Entwurf ist und eine WorkDescription hat, ist das unser Gold-Treffer!
            if (tempId && isDraft && workDesc !== '') {
                uniqueTemplates.set(tempId, {
                    TemplateID: tempId,
                    Name: `${workDesc} (ID: ${tempId})` // Wir zeigen den Namen plus ID zur Kontrolle an
                });
                console.log(`🎯 Entwurf-Treffer für Template #${tempId}: Name "${workDesc}" übernommen.`);
            }
        });

        // STUFE 2: Für alle anderen Vorlagen, die in Entwürfen nicht gefunden wurden, füllen wir auf
        checklists.forEach((cl: any) => {
            const tempId = cl.TemplateID;
            if (tempId && !uniqueTemplates.has(tempId)) {
                // Wir versuchen WorkDescription, ansonsten Standard-Namen oder die Nummer
                const fallbackName = cl.WorkDescription?.trim() 
                                  || cl.TemplateName 
                                  || cl.Subject 
                                  || `Vorlage #${tempId}`;
                
                uniqueTemplates.set(tempId, {
                    TemplateID: tempId,
                    Name: fallbackName
                });
                console.log(`ℹ️ Standard-Treffer für Template #${tempId}: "${fallbackName}"`);
            }
        });

        const resultList = Array.from(uniqueTemplates.values());
        console.log(`✅ ${resultList.length} einzigartige Vorlagen für das Dashboard bereitgestellt.\n`);
        res.json(resultList);

    } catch (error: any) {
        console.error("Fehler bei der Template-Extraktion:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// 8. Benutzer abrufen (für die AuthorContactID)
app.get('/api/users/:portfolioId', async (req: Request, res: Response) => {
    const token = getAuthToken(req);
    if (!token) return res.status(401).json({ error: 'Nicht eingeloggt', message: 'Kein Access Token vorhanden.' });
    const { portfolioId } = req.params;
    const cleanToken = String(token).replace(/[^a-zA-Z0-9\-._~+/=]/g, "");
    const cleanUrl = String(process.env.BASE_URL).replace(/[^a-zA-Z0-9\-._~:/?=]/g, "");

    try {
        const response = await fetch(`${cleanUrl}/${portfolioId}/users/list`, {
            headers: { 'Authorization': `Bearer ${cleanToken}`, 'Accept': 'application/json' }
        });
        const data = await response.json();
        if (!response.ok || (data && data.fault)) {
            return res.status(response.status >= 400 ? response.status : 401).json(data);
        }
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

let cachedClientToken = '';
let cachedClientTokenExp = 0;

// Helper to get active ProjectSight API token (with auto-fallback to Client Credentials if needed)
async function getOrFetchPsToken(req?: Request): Promise<string> {
    if (req) {
        const userToken = getAuthToken(req);
        if (userToken) return userToken;
    }
    if (psOAuthAccessToken) return psOAuthAccessToken;

    if (cachedClientToken && Date.now() < cachedClientTokenExp) {
        return cachedClientToken;
    }

    try {
        console.log("🔑 Generiere ProjectSight API Access Token (Client Credentials)...");
        const clientId = process.env.CLIENT_ID ? process.env.CLIENT_ID.trim() : '';
        const clientSecret = process.env.CLIENT_SECRET ? process.env.CLIENT_SECRET.trim() : '';
        const tokenUrl = process.env.TOKEN_URL ? process.env.TOKEN_URL.trim() : 'https://id.trimble.com/oauth/token';

        const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        if (process.env.SCOPE) {
            params.append('scope', process.env.SCOPE.trim());
        }

        const response = await fetch(tokenUrl, {
            method: 'POST',
            body: params,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${basicAuth}`
            }
        });

        const data = await response.json();
        if (response.ok && data.access_token) {
            cachedClientToken = data.access_token;
            cachedClientTokenExp = Date.now() + ((data.expires_in || 3600) - 60) * 1000;
            console.log("✅ ProjectSight API Access Token (Client Credentials) bereitgestellt.");
            return cachedClientToken;
        } else {
            console.warn("⚠️ Client Credentials Abruf fehlgeschlagen:", data);
        }
    } catch (err: any) {
        console.error("❌ Fehler beim Client Credentials Abruf:", err.message);
    }

    return psOAuthAccessToken || connectViewerToken || '';
}

// 8b. UDFs (User Defined Fields) für Checklisten abrufen
app.get('/api/udfs/:portfolioId', async (req: Request, res: Response) => {
    let token = await getOrFetchPsToken(req);
    if (!token) return res.status(401).json({ error: 'Nicht eingeloggt', message: 'Kein Access Token vorhanden.' });
    const { portfolioId } = req.params;
    const cleanUrl = String(process.env.BASE_URL).replace(/[^a-zA-Z0-9\-._~:/?=]/g, "");

    try {
        console.log(`\n--- 📋 RUFE CHECKLISTEN UDFs AB FÜR PORTFOLIO: ${portfolioId} ---`);
        let response = await fetch(`${cleanUrl}/${portfolioId}/checklists/udfs`, {
            headers: { 'Authorization': `Bearer ${String(token).replace(/[^a-zA-Z0-9\-._~+/=]/g, "")}`, 'Accept': 'application/json' }
        });
        let data = await response.json();
        
        // Fallback zu Client Credentials Token falls User Token inaktive Subscription meldet (Code 900909)
        if (data && data.fault && (data.fault.code === '900909' || data.fault.status === '401')) {
            console.warn("⚠️ Access Token verweigert Scope (900909). Versuche Client Credentials Token...");
            const clientToken = await getOrFetchPsToken();
            if (clientToken && clientToken !== token) {
                response = await fetch(`${cleanUrl}/${portfolioId}/checklists/udfs`, {
                    headers: { 'Authorization': `Bearer ${String(clientToken).replace(/[^a-zA-Z0-9\-._~+/=]/g, "")}`, 'Accept': 'application/json' }
                });
                data = await response.json();
            }
        }

        if (!response.ok || (data && data.fault)) {
            console.error("❌ UDFs API Fehler:", data);
            return res.status(response.status >= 400 ? response.status : 401).json(data);
        }
        console.log(`✅ ${Array.isArray(data) ? data.length : 0} UDFs abgerufen.`);
        res.json(data);
    } catch (error: any) {
        console.error("❌ Fehler beim UDF Abruf:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// 8b-2. Volle Checklisten-Hierarchie inkl. Items/Zeilen abrufen: GET /{portfolioGuid}/{projectId}/checklists
app.get('/api/checklists-full/:portfolioId/:projectId', async (req: Request, res: Response) => {
    let token = await getOrFetchPsToken(req);
    if (!token) return res.status(401).json({ error: 'Nicht eingeloggt', message: 'Kein Access Token vorhanden.' });
    const { portfolioId, projectId } = req.params;
    const cleanUrl = String(process.env.BASE_URL).replace(/[^a-zA-Z0-9\-._~:/?=]/g, "");

    try {
        console.log(`\n--- 📋 RUFE VOLLSTÄNDIGE CHECKLISTEN-HIERARCHIE AB: /${portfolioId}/${projectId}/checklists ---`);
        let response = await fetch(`${cleanUrl}/${portfolioId}/${projectId}/checklists`, {
            headers: { 'Authorization': `Bearer ${String(token).replace(/[^a-zA-Z0-9\-._~+/=]/g, "")}`, 'Accept': 'application/json' }
        });
        let data = await response.json();

        if (!response.ok || (data && data.fault)) {
            console.error("❌ Full Checklists API Fehler:", data);
            return res.status(response.status >= 400 ? response.status : 401).json(data);
        }
        res.json(data);
    } catch (error: any) {
        console.error("❌ Fehler beim Abruf der Checklisten-Hierarchie:", error.message);
        res.status(500).json({ error: error.message });
    }
});


// 8c. TEST-ENDPUNKT: Versucht alle Vorlagen- / Zeilen-UDFs (Line Item UDFs) abzurufen
app.get('/api/test/lineitem-udfs/:portfolioId/:projectId', async (req: Request, res: Response) => {
    let token = await getOrFetchPsToken(req);
    const { portfolioId, projectId } = req.params;
    const templateId = req.query.templateId as string | undefined;
    const cleanUrl = String(process.env.BASE_URL).replace(/[^a-zA-Z0-9\-._~:/?=]/g, "");

    console.log(`\n--- 🧪 TEST-LABOR: PROBE ZEILEN-ITEMS UDFs (Line Item UDFs) ---`);
    console.log(`Portfolio: ${portfolioId}, Project: ${projectId}, Template: ${templateId || 'Keine'}`);

    const results: Record<string, any> = {};

    async function tryEndpoint(name: string, path: string) {
        try {
            let activeToken = token;
            const url = `${cleanUrl}${path}`;
            console.log(`🔍 Teste Endpunkt [${name}]: GET ${url}`);
            
            let apiRes = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${String(activeToken).replace(/[^a-zA-Z0-9\-._~+/=]/g, "")}`,
                    'Accept': 'application/json'
                }
            });
            let status = apiRes.status;
            let data: any = null;
            try {
                data = await apiRes.json();
            } catch (e) {
                data = await apiRes.text();
            }

            // Falls Subscription inactive (Code 900909), erstelle einen Retry mit Client Credentials Token
            if (data && data.fault && data.fault.code === '900909') {
                const clientToken = await getOrFetchPsToken();
                if (clientToken && clientToken !== activeToken) {
                    console.log(`🔄 Retrying [${name}] mit Client Credentials Token...`);
                    apiRes = await fetch(url, {
                        headers: {
                            'Authorization': `Bearer ${String(clientToken).replace(/[^a-zA-Z0-9\-._~+/=]/g, "")}`,
                            'Accept': 'application/json'
                        }
                    });
                    status = apiRes.status;
                    try {
                        data = await apiRes.json();
                    } catch (e) {
                        data = await apiRes.text();
                    }
                }
            }

            results[name] = {
                endpoint: path,
                status,
                ok: apiRes.ok,
                data
            };
        } catch (err: any) {
            results[name] = {
                endpoint: path,
                error: err.message
            };
        }
    }

    // 1. Offizielle ProjectSight Endpunkte aus der API-Spezifikation (SKILL.md)
    await tryEndpoint('checklists_udfs', `/${portfolioId}/checklists/udfs`);
    await tryEndpoint('project_checklist_templates', `/${portfolioId}/${projectId}/checklists/templates`);
    await tryEndpoint('checklists_full_hierarchy', `/${portfolioId}/${projectId}/checklists`);
    await tryEndpoint('checklists_summary_list', `/${portfolioId}/${projectId}/checklists/list`);

    // 2. Experimentelle Kandidaten-Pfade für Zeilen-Items
    await tryEndpoint('checklistitems_udfs', `/${portfolioId}/checklistitems/udfs`);
    await tryEndpoint('checklists_items_udfs', `/${portfolioId}/checklists/items/udfs`);
    await tryEndpoint('checklists_lineitems_udfs', `/${portfolioId}/checklists/lineitems/udfs`);

    if (templateId) {
        await tryEndpoint('template_details', `/${portfolioId}/${projectId}/checklists/templates/${templateId}`);
        await tryEndpoint('template_udfs', `/${portfolioId}/${projectId}/checklists/templates/${templateId}/udfs`);
        await tryEndpoint('template_items', `/${portfolioId}/${projectId}/checklists/templates/${templateId}/items`);
    }

    // Filter UDFs aus `checklists_udfs` für Zeilen-Items / Line Items
    let lineItemUdfs: any[] = [];
    if (results.checklists_udfs && Array.isArray(results.checklists_udfs.data)) {
        lineItemUdfs = results.checklists_udfs.data.filter((udf: any) => {
            const tableName = String(udf.TableName || '').toLowerCase();
            const tableType = udf.TableType;
            return tableName.includes('item') || tableName.includes('line') || tableType !== 0;
        });
    }

    res.json({
        success: true,
        timestamp: new Date().toISOString(),
        portfolioId,
        projectId,
        templateId: templateId || null,
        detectedLineItemUdfs: lineItemUdfs,
        endpointResults: results
    });
});



// 9. Neue Checkliste per POST aus Vorlage in ProjectSight erstellen
app.post('/api/checklists', async (req: Request, res: Response) => {
    const token = getAuthToken(req);
    if (!token) return res.status(401).json({ error: 'Nicht eingeloggt', message: 'Kein Access Token vorhanden.' });

    if (!req.body) {
        return res.status(400).json({ error: 'Keine Daten empfangen.' });
    }

    const cleanToken = String(token).replace(/[^a-zA-Z0-9\-._~+/=]/g, "");
    const cleanUrl = String(process.env.BASE_URL).replace(/[^a-zA-Z0-9\-._~:/?=]/g, "");
    const { portfolioId, projectId, AuthorContactID, AuthorCompanyID, TemplateID, WorkflowState, Number, WorkDescription, udfValues, udfs } = req.body;

    const payload: any = {
        AuthorContactID: parseInt(AuthorContactID),
        TemplateID: parseInt(TemplateID),
        WorkflowState: parseInt(WorkflowState),
        Number: String(Number || `CHK-${Date.now().toString().slice(-4)}`),
        DateCreated: new Date().toISOString(),
        WorkDescription: String(WorkDescription || "Erstellt über die API-Test-App")
    };

    if (AuthorCompanyID && !isNaN(parseInt(AuthorCompanyID))) {
        payload.AuthorCompanyID = parseInt(AuthorCompanyID);
    }

    if (udfValues && typeof udfValues === 'object') {
        Object.entries(udfValues).forEach(([name, val]) => {
            if (val !== undefined && val !== null && val !== '') {
                payload[name] = val;
            }
        });
    }
    if (Array.isArray(udfs) && udfs.length > 0) {
        payload.UDFs = udfs;
    }

    console.log(`\n--- 🚀 SENDE POST-REQUEST (ERSTERSTELLUNG TEMPLATE #${TemplateID}) AN PROJECTSIGHT ---`);
    console.log("Ziel-URL:", `${cleanUrl}/${portfolioId}/${projectId}/checklists`);
    console.log("Payload:", JSON.stringify(payload, null, 2));

    try {
        const response = await fetch(`${cleanUrl}/${portfolioId}/${projectId}/checklists`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${cleanToken}`, 
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const text = await response.text();
        let data: any = {};
        if (text && text.trim()) {
            try {
                data = JSON.parse(text);
            } catch (e) {
                data = { message: text };
            }
        }

        if (!response.ok) {
            console.error("❌ API-Fehler beim POST:", JSON.stringify(data, null, 2));
            return res.status(response.status).json({ error: data.message || "API verweigerte POST-Anfrage", details: data });
        }

        console.log("✅ ERFOLG! Checklisten POST verarbeitet. ID:", data.ChecklistID || data.Id);
        res.json(data);

    } catch (error: any) {
        console.error("❌ Netzwerkfehler beim POST:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// 9b. Einzelne Checkliste aus ProjectSight abrufen (GET)
app.get('/api/checklists/:portfolioId/:projectId/:checklistId', async (req: Request, res: Response) => {
    let token = await getOrFetchPsToken(req);
    if (!token) return res.status(401).json({ error: 'Nicht eingeloggt', message: 'Kein Access Token vorhanden.' });

    const { portfolioId, projectId, checklistId } = req.params;
    const cleanToken = String(token).replace(/[^a-zA-Z0-9\-._~+/=]/g, "");
    const cleanUrl = String(process.env.BASE_URL).replace(/[^a-zA-Z0-9\-._~:/?=]/g, "");

    try {
        const response = await fetch(`${cleanUrl}/${portfolioId}/${projectId}/checklists/${checklistId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${cleanToken}`,
                'Accept': 'application/json'
            }
        });

        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error: any) {
        console.error("❌ Fehler beim Abrufen der Checkliste:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// 9c. Checkliste und ihre ChecklistItems in ProjectSight per PUT aktualisieren
app.put('/api/checklists/:portfolioId/:projectId/:checklistId', async (req: Request, res: Response) => {
    let token = await getOrFetchPsToken(req);
    if (!token) return res.status(401).json({ error: 'Nicht eingeloggt', message: 'Kein Access Token vorhanden.' });

    const { portfolioId, projectId, checklistId } = req.params;
    const cleanToken = String(token).replace(/[^a-zA-Z0-9\-._~+/=]/g, "");
    const cleanUrl = String(process.env.BASE_URL).replace(/[^a-zA-Z0-9\-._~:/?=]/g, "");

    const inputData = req.body || {};
    const rawItems = Array.isArray(inputData.ChecklistItems) ? inputData.ChecklistItems : (Array.isArray(inputData.Items) ? inputData.Items : []);

    const mappedChecklistItems = rawItems.map((it: any) => {
        const itemId = parseInt(it.ChecklistItemID || it.Id || it.ItemID);
        const val = String(it.Value !== undefined && it.Value !== null ? it.Value : (it.Text !== undefined && it.Text !== null ? it.Text : ''));
        return {
            ...it,
            ChecklistItemID: itemId,
            Id: itemId,
            TemplateItemID: parseInt(it.TemplateItemID || it.TemplateItemId || 0),
            Description: String(it.Description || ''),
            Value: val,
            Status: String(it.Status || 'None'),
            Comments: String(it.Comments || '')
        };
    });

    const payload: any = {
        ...inputData,
        ChecklistID: parseInt(checklistId),
        Id: parseInt(checklistId),
        ChecklistItems: mappedChecklistItems
    };
    delete payload.portfolioId;
    delete payload.projectId;
    delete payload.Items; // Deprecated reduntant Items array removed

    console.log(`\n--- 🚀 SENDE PUT-REQUEST FÜR CHECKLISTE #${checklistId} AN PROJECTSIGHT ---`);
    console.log("Ziel-URL:", `${cleanUrl}/${portfolioId}/${projectId}/checklists/${checklistId}`);
    console.log("Payload (ChecklistItems Count:", mappedChecklistItems.length, "):", JSON.stringify(payload, null, 2));

    try {
        const response = await fetch(`${cleanUrl}/${portfolioId}/${projectId}/checklists/${checklistId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${cleanToken}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const text = await response.text();
        let data: any = {};
        if (text && text.trim()) {
            try {
                data = JSON.parse(text);
            } catch (e) {
                data = { message: text };
            }
        }

        if (!response.ok) {
            console.error(`❌ API-Fehler beim PUT-Update der Checkliste #${checklistId}:`, JSON.stringify(data, null, 2));
            return res.status(response.status).json({ error: data.message || "API verweigerte Aktualisierung", details: data });
        }

        console.log(`✅ ERFOLG! Checkliste #${checklistId} per PUT aktualisiert.`);
        res.json(data.ChecklistID ? data : { success: true, ChecklistID: checklistId, ...data });
    } catch (error: any) {
        console.error("❌ Netzwerkfehler beim PUT:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// 9. DAS VOLLSTÄNDIGE FRONTEND: Dashboard mit HTML und JavaScript
app.get('/dashboard', (req: Request, res: Response) => {
    if (!getAuthToken(req)) return res.redirect('/');

    res.send(`
    <!DOCTYPE html>
    <html lang="de">
    <head>
        <meta charset="UTF-8">
        <title>ProjectSight - Checklisten-Wizard</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 900px; margin: 40px auto; padding: 20px; background: #f4f7f6; color: #333; }
            .card { background: white; padding: 25px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-bottom: 20px; }
            h1, h2, h3 { color: #0063a3; margin-top: 0; }
            label { font-weight: bold; display: block; margin: 15px 0 5px; }
            input[type="text"], select { width: 100%; padding: 12px; border: 1px solid #ccc; border-radius: 4px; font-size: 16px; background: #fff; box-sizing: border-box; }
            .info-box { background: #eef7ff; border-left: 4px solid #0063a3; padding: 20px; margin-top: 20px; display: none; }
            .success-box { background: #e8f8f0; border-left: 4px solid #28a745; padding: 20px; margin-top: 20px; display: none; }
            .error-box { background: #fde8e8; border-left: 4px solid #dc3545; padding: 20px; margin-top: 20px; display: none; color: #a80000; word-break: break-all; }
            .code { font-family: monospace; background: #e0e0e0; padding: 2px 6px; border-radius: 3px; font-weight: bold; }
            .btn { background: #28a745; color: white; border: none; padding: 15px 25px; font-size: 18px; font-weight: bold; border-radius: 5px; cursor: pointer; width: 100%; margin-top: 15px; transition: background 0.2s; }
            .btn:hover { background: #218838; }
            .btn:disabled { background: #ccc; cursor: not-allowed; }
        </style>
    </head>
    <body>
        <div class="card">
            <h1>🏗️ ProjectSight Checklisten-Wizard</h1>
            <p>Schritt-für-Schritt zur neuen Checkliste:</p>
            
            <label for="portfolioSelect">1. Account / Portfolio auswählen:</label>
            <select id="portfolioSelect" onchange="loadProjects()"><option value="">-- Lade Portfolios... --</option></select>

            <div id="projectContainer" style="display: none;">
                <label for="projectSelect">2. Projekt auswählen:</label>
                <select id="projectSelect" onchange="loadMetadata()"><option value="">-- Bitte wählen --</option></select>
            </div>

            <div id="metadataContainer" style="display: none; border-top: 2px solid #eee; padding-top: 15px; margin-top: 15px;">
                <h3>📋 3. Checklisten-Details festlegen (Schritt 4)</h3>
                <label for="stateSelect">Workflow Status:</label>
                <select id="stateSelect" onchange="updateSummary()"><option value="">-- Lade Status... --</option></select>

                <label for="templateSelect">Checklisten-Vorlage (Template):</label>
                <select id="templateSelect" onchange="updateSummary()"><option value="">-- Lade Vorlagen... --</option></select>

                <label for="authorSelect">Ersteller / Autor:</label>
                <select id="authorSelect" onchange="updateSummary()"><option value="">-- Lade Benutzer... --</option></select>
                
                <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 15px; margin-top: 10px;">
                    <div>
                        <label for="inputNumber">Nummer (z.B. CHK-101):</label>
                        <input type="text" id="inputNumber" placeholder="CHK-001" value="TEST-001">
                    </div>
                    <div>
                        <label for="inputDesc">WorkDescription (Titel/Beschreibung):</label>
                        <input type="text" id="inputDesc" placeholder="Was wird geprüft?" value="API Live-Test Checkliste">
                    </div>
                </div>
            </div>

            <div id="resultBox" class="info-box">
                <h3>🚀 Bereit für den POST-Request!</h3>
                <p>Die Pflicht-IDs sind geladen. Klicke unten, um die Checkliste live zu erzeugen:</p>
                <button id="createBtn" class="btn" onclick="createChecklist()">✨ Checkliste jetzt in ProjectSight erstellen!</button>
            </div>

            <div id="successBox" class="success-box">
                <h3>🎉 HERZLICHEN GLÜCKWUNSCH! Checkliste erfolgreich erstellt!</h3>
                <p>Die API hat den Status 200 OK zurückgemeldet.</p>
                <p><b>Neues Checklisten-Objekt:</b></p>
                <ul>
                    <li><b>Checklist ID:</b> <span id="resId" class="code"></span></li>
                    <li><b>Nummer:</b> <span id="resNum" class="code"></span></li>
                    <li><b>Erstellt am:</b> <span id="resDate" class="code"></span></li>
                </ul>
                <a href="/dashboard" style="display:inline-block; margin-top:10px; color:#0063a3; font-weight:bold;">🔄 Noch eine Checkliste erstellen</a>
            </div>

            <div id="errorBox" class="error-box">
                <h3>❌ Fehler beim Erstellen</h3>
                <p id="errorText"></p>
            </div>
        </div>

        <script>
            async function init() {
                try {
                    const res = await fetch('/api/portfolios');
                    const portfolios = await res.json();
                    const select = document.getElementById('portfolioSelect');
                    select.innerHTML = '<option value="">-- Bitte Portfolio wählen --</option>';
                    const list = Array.isArray(portfolios) ? portfolios : (portfolios.items || []);
                    list.forEach(p => { select.innerHTML += \`<option value="\${p.PortfolioID}">\${p.Name} (\${p.AccountName})</option>\`; });
                } catch(e) { alert('Fehler beim Laden der Portfolios'); }
            }

            async function loadProjects() {
                const portId = document.getElementById('portfolioSelect').value;
                document.getElementById('projectContainer').style.display = portId ? 'block' : 'none';
                document.getElementById('metadataContainer').style.display = 'none';
                document.getElementById('resultBox').style.display = 'none';
                document.getElementById('successBox').style.display = 'none';
                if (!portId) return;

                const select = document.getElementById('projectSelect');
                select.innerHTML = '<option value="">-- Lade Projekte... --</option>';
                const res = await fetch(\`/api/projects/\${portId}\`);
                const projects = await res.json();
                select.innerHTML = '<option value="">-- Projekt wählen --</option>';
                const list = Array.isArray(projects) ? projects : (projects.items || []);
                list.forEach(proj => { select.innerHTML += \`<option value="\${proj.ProjectID || proj.Id}">\${proj.Name || proj.ProjectName}</option>\`; });
            }

            async function loadMetadata() {
                const portId = document.getElementById('portfolioSelect').value;
                const projId = document.getElementById('projectSelect').value;
                const metaBox = document.getElementById('metadataContainer');
                document.getElementById('resultBox').style.display = 'none';
                document.getElementById('successBox').style.display = 'none';
                if (!projId) { metaBox.style.display = 'none'; return; }
                metaBox.style.display = 'block';

                fetch(\`/api/workflowstates/\${portId}/\${projId}\`).then(r => r.json()).then(data => {
                    const sel = document.getElementById('stateSelect');
                    sel.innerHTML = '<option value="">-- Status wählen --</option>';
                    const list = Array.isArray(data) ? data : (data.items || []);
                    list.forEach(item => { sel.innerHTML += \`<option value="\${item.WorkflowStateID || item.Id}">\${item.Name || item.StateName || item.Id}</option>\`; });
                });

                fetch(\`/api/templates/\${portId}/\${projId}\`).then(r => r.json()).then(data => {
                    const sel = document.getElementById('templateSelect');
                    sel.innerHTML = '<option value="">-- Vorlage wählen --</option>';
                    const list = Array.isArray(data) ? data : (data.items || []);
                    list.forEach(item => { sel.innerHTML += \`<option value="\${item.TemplateID || item.Id}">\${item.Name}</option>\`; });
                });

                fetch(\`/api/users/\${portId}\`).then(r => r.json()).then(data => {
                    const sel = document.getElementById('authorSelect');
                    sel.innerHTML = '<option value="">-- Ersteller wählen --</option>';
                    const list = Array.isArray(data) ? data : (data.items || []);
                    list.forEach(item => { 
                        const compId = item.CompanyID || item.Company?.Id || '';
                        sel.innerHTML += \`<option value="\${item.ContactID || item.Id || item.UserID}" data-comp="\${compId}">\${item.FirstName} \${item.LastName}</option>\`; 
                    });
                });
            }

            function updateSummary() {
                const portId = document.getElementById('portfolioSelect').value;
                const projId = document.getElementById('projectSelect').value;
                const stateId = document.getElementById('stateSelect').value;
                const tempId = document.getElementById('templateSelect').value;
                const authId = document.getElementById('authorSelect').value;
                document.getElementById('resultBox').style.display = (portId && projId && stateId && tempId && authId) ? 'block' : 'none';
            }

            async function createChecklist() {
                const btn = document.getElementById('createBtn');
                btn.disabled = true;
                btn.innerText = "⏳ Erstelle Checkliste in ProjectSight...";
                document.getElementById('errorBox').style.display = 'none';
                document.getElementById('successBox').style.display = 'none';

                const authorSelect = document.getElementById('authorSelect');
                const selectedOption = authorSelect.options[authorSelect.selectedIndex];
                const companyId = selectedOption ? selectedOption.getAttribute('data-comp') : null;

                const payload = {
                    portfolioId: document.getElementById('portfolioSelect').value,
                    projectId: document.getElementById('projectSelect').value,
                    WorkflowState: document.getElementById('stateSelect').value,
                    TemplateID: document.getElementById('templateSelect').value,
                    AuthorContactID: authorSelect.value,
                    AuthorCompanyID: companyId,
                    Number: document.getElementById('inputNumber').value,
                    WorkDescription: document.getElementById('inputDesc').value
                };

                try {
                    const res = await fetch('/api/checklists', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    const result = await res.json();

                    if (res.ok) {
                        document.getElementById('resultBox').style.display = 'none';
                        document.getElementById('resId').innerText = result.ChecklistID || result.Id || "Erfolgreich";
                        document.getElementById('resNum').innerText = result.Number || payload.Number;
                        document.getElementById('resDate').innerText = result.DateCreated || new Date().toLocaleTimeString();
                        document.getElementById('successBox').style.display = 'block';
                    } else {
                        throw new Error(result.error || result.message || JSON.stringify(result));
                    }
                } catch (err) {
                    document.getElementById('errorText').innerText = err.message;
                    document.getElementById('errorBox').style.display = 'block';
                    btn.disabled = false;
                    btn.innerText = "✨ Checkliste jetzt in ProjectSight erstellen!";
                }
            }

            init();
        </script>
    </body>
    </html>
    `);
});

// WICHTIG: Dieser Befehl MUSS immer ganz am Ende stehen!
app.listen(port, () => {
    console.log(`🚀 Server läuft auf http://localhost:${port}`);
});
