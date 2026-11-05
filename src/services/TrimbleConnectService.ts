import * as WorkspaceAPI from 'trimble-connect-workspace-api';

export class TrimbleConnectService {
  private static apiInstance: any = null;

  static async init() {
    if (this.apiInstance) return this.apiInstance;

    try {
      this.apiInstance = await WorkspaceAPI.connect(
        window.parent,
        (event: any, args: any) => {
          console.log('Received event from Connect:', event, args);
          window.dispatchEvent(new CustomEvent('trimble-event', { detail: { event, args } }));
        },
        30000
      );
      return this.apiInstance;
    } catch (error) {
      console.error('Failed to initialize Workspace API', error);
      throw error;
    }
  }

  static getAPI() {
    return this.apiInstance;
  }

  static async getSelection() {
    if (!this.apiInstance || !this.apiInstance.viewer) throw new Error('Viewer API not initialized');
    return await this.apiInstance.viewer.getSelection();
  }

  static async convertToObjectIds(modelId: string, runtimeIds: number[]) {
    if (!this.apiInstance || !this.apiInstance.viewer) throw new Error('Viewer API not initialized');
    return await this.apiInstance.viewer.convertToObjectIds(modelId, runtimeIds);
  }

  static async getObjectProperties(modelId: string, runtimeIds: number[]) {
    if (!this.apiInstance || !this.apiInstance.viewer) throw new Error('Viewer API not initialized');
    return await this.apiInstance.viewer.getObjectProperties(modelId, runtimeIds);
  }

  static async getProject() {
    if (!this.apiInstance || !this.apiInstance.project) throw new Error('Project API not initialized');
    return await this.apiInstance.project.getProject();
  }

  static setMenu(menuObject: any) {
    if (!this.apiInstance || !this.apiInstance.ui) {
      console.warn('UI API not available');
      return;
    }
    this.apiInstance.ui.setMenu(menuObject);
  }

  static async addProperty(modelId: string, objectId: string, propertySet: string, propertyName: string, value: string) {
    console.log(`Adding property ${propertyName}=${value} to ${objectId} in model ${modelId} under set ${propertySet}`);
    // Simulate or invoke project API if available
  }

  static async getSettings() {
    if (!this.apiInstance || !this.apiInstance.extension) throw new Error('Extension API not initialized');
    return await this.apiInstance.extension.getSettings();
  }
}
