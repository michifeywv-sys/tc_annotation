export interface ParsedTemplateItem {
  TemplateItemID: number;
  Description: string;
  ValueType: number; // 3=Date/Time, 4=Dropdown, 8=ID, 9=Text, 10=Checkbox/YesNo, 11=Header, 13=Signature/Contact
  IncludeYesNoNA: boolean;
  OrderNumber?: number;
  Value: string;
  Status?: 'Pass' | 'Fail' | 'NA' | 'Yes' | 'No' | '' | string;
  Comments?: string;
  MappedProperty?: string; // 3D Model Property key if mapped
}

/**
 * Maps raw ValueType integers to human readable labels
 */
export function getValueTypeLabel(valueType: number): string {
  switch (valueType) {
    case 3: return 'Datum / Zeit (3)';
    case 4: return 'Dropdown (4)';
    case 8: return 'Titel (Read-Only 8)';
    case 9: return 'Text Input (9)';
    case 10: return 'Boolean (10)';
    case 11: return 'Header / Section (11)';
    case 13: return 'Unterschrift (Read-Only 13)';
    default: return `Feldtyp (${valueType})`;
  }
}

/**
 * Extracts and parses checklist template items from various ProjectSight API responses
 */
export function parseChecklistItems(apiResponse: any, targetTemplateId?: string | number): ParsedTemplateItem[] {
  if (!apiResponse) return [];

  let rawItems: any[] = [];

  // Handle direct array response
  if (Array.isArray(apiResponse)) {
    rawItems = apiResponse;
  } 
  // Handle object containing items/ChecklistItems/TemplateItems
  else if (typeof apiResponse === 'object') {
    if (Array.isArray(apiResponse.Items)) rawItems = apiResponse.Items;
    else if (Array.isArray(apiResponse.ChecklistItems)) rawItems = apiResponse.ChecklistItems;
    else if (Array.isArray(apiResponse.TemplateItems)) rawItems = apiResponse.TemplateItems;
    else if (Array.isArray(apiResponse.items)) rawItems = apiResponse.items;
    else if (Array.isArray(apiResponse.data)) rawItems = apiResponse.data;
  }

  // Filter for specific template if targetTemplateId is provided and response contains multiple templates
  if (targetTemplateId && rawItems.length > 0) {
    const matchingTemplate = rawItems.find(
      (t: any) => String(t.TemplateID || t.Id || t.id) === String(targetTemplateId)
    );
    if (matchingTemplate) {
      if (Array.isArray(matchingTemplate.Items)) rawItems = matchingTemplate.Items;
      else if (Array.isArray(matchingTemplate.ChecklistItems)) rawItems = matchingTemplate.ChecklistItems;
      else if (Array.isArray(matchingTemplate.TemplateItems)) rawItems = matchingTemplate.TemplateItems;
    }
  }

  // Normalize item properties
  const parsedItems: ParsedTemplateItem[] = rawItems.map((raw: any, index: number) => {
    const templateItemId = parseInt(raw.TemplateItemID || raw.TemplateItemId || raw.ItemID || raw.Id || index + 1);
    const description = String(raw.Description || raw.Name || raw.Caption || raw.Title || `Feld #${templateItemId}`);
    const valueType = parseInt(raw.ValueType || raw.Type || 9);
    const includeYesNoNA = Boolean(raw.IncludeYesNoNA ?? raw.IncludeYesNoNa ?? (valueType === 10));

    return {
      TemplateItemID: isNaN(templateItemId) ? index + 1 : templateItemId,
      Description: description,
      ValueType: isNaN(valueType) ? 9 : valueType,
      IncludeYesNoNA: includeYesNoNA,
      OrderNumber: raw.OrderNumber || index + 1,
      Value: raw.Value !== undefined && raw.Value !== null ? String(raw.Value) : '',
      Status: raw.Status || raw.Result || '',
      Comments: raw.Comments || ''
    };
  });

  return parsedItems;
}
