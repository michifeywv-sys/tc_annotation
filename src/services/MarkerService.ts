import { TrimbleConnectService } from './TrimbleConnectService';

export class MarkerService {
  static async addMarker(x: number, y: number, z: number, label: string) {
    const api = TrimbleConnectService.getAPI();
    if (!api) throw new Error('API not initialized');

    console.log(`Adding marker '${label}' at (${x}, ${y}, ${z})`);
    
    // Simulate placing a 3D markup/marker using the Workspace API
    // await api.viewer.addMarkup({ type: 'marker', position: {x,y,z}, label });
    return true;
  }
}
