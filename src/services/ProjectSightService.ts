export interface PSChecklistPayload {
  portfolioId: string;
  projectId: string;
  AuthorContactID: string;
  AuthorCompanyID?: string | null;
  TemplateID: string;
  WorkflowState: string;
  Number: string;
  WorkDescription: string;
  udfValues?: Record<string, any>;
  udfs?: any[];
  Items?: Array<{
    TemplateItemID: number;
    Description?: string;
    Value?: string;
    Status?: string;
    Comments?: string;
    ValueType?: number;
    IncludeYesNoNA?: boolean;
  }>;
}


export class ProjectSightService {
  private static async checkResponse(response: any) {
    const text = await response.text().catch(() => '');
    let data: any = {};
    if (text && text.trim()) {
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = { message: text };
      }
    }

    if (
      response.status === 401 ||
      (data && data.fault && (data.fault.status === '401' || data.fault.status === 401)) ||
      (data && data.error === 'Nicht eingeloggt')
    ) {
      throw new Error('NOT_LOGGED_IN');
    }
    if (!response.ok || (data && data.fault)) {
      throw new Error(data.fault?.description || data.fault?.message || data.error || response.statusText || 'API Request failed');
    }
    return data;
  }

  static async getPortfolios() {
    const response = await fetch('/api/portfolios');
    const data = await this.checkResponse(response);
    return Array.isArray(data) ? data : (data.items || []);
  }

  static async getProjects(portfolioId: string) {
    const response = await fetch(`/api/projects/${portfolioId}`);
    const data = await this.checkResponse(response);
    return Array.isArray(data) ? data : (data.items || []);
  }

  static async getWorkflowStates(portfolioId: string, projectId: string) {
    const response = await fetch(`/api/workflowstates/${portfolioId}/${projectId}`);
    const data = await this.checkResponse(response);
    return Array.isArray(data) ? data : (data.items || []);
  }

  static async getTemplates(portfolioId: string, projectId: string) {
    const response = await fetch(`/api/templates/${portfolioId}/${projectId}`);
    return this.checkResponse(response);
  }

  static async getUsers(portfolioId: string) {
    const response = await fetch(`/api/users/${portfolioId}`);
    const data = await this.checkResponse(response);
    return Array.isArray(data) ? data : (data.items || []);
  }

  static async getUdfs(portfolioId: string) {
    const response = await fetch(`/api/udfs/${portfolioId}`);
    const data = await this.checkResponse(response);
    return Array.isArray(data) ? data : (data.items || []);
  }

  static async createChecklist(payload: PSChecklistPayload) {
    const response = await fetch('/api/checklists', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    return this.checkResponse(response);
  }

  static async getChecklistsFull(portfolioId: string, projectId: string) {
    const response = await fetch(`/api/checklists-full/${portfolioId}/${projectId}`);
    return this.checkResponse(response);
  }

  static async getChecklist(portfolioId: string, projectId: string, checklistId: string | number) {
    const response = await fetch(`/api/checklists/${portfolioId}/${projectId}/${checklistId}`);
    return this.checkResponse(response);
  }

  static async updateChecklist(portfolioId: string, projectId: string, checklistId: string | number, payload: any) {
    const response = await fetch(`/api/checklists/${portfolioId}/${projectId}/${checklistId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    return this.checkResponse(response);
  }

  static async testLineItemUdfs(portfolioId: string, projectId: string, templateId?: string) {
    const url = `/api/test/lineitem-udfs/${portfolioId}/${projectId}${templateId ? `?templateId=${encodeURIComponent(templateId)}` : ''}`;
    const response = await fetch(url);
    return this.checkResponse(response);
  }
}


