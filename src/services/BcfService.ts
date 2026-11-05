import { TrimbleConnectService } from './TrimbleConnectService';

export class BcfService {
  static async getTopics() {
    const api = TrimbleConnectService.getAPI();
    if (!api) throw new Error('API not initialized');
    
    // In a real scenario, you'd fetch BCF topics via the Trimble Connect API.
    // For this example, we mock a response.
    return [
      { id: '1', title: 'Clash detected', status: 'Open' },
      { id: '2', title: 'Missing information', status: 'Closed' }
    ];
  }

  static async createTopic(title: string, description: string) {
    const api = TrimbleConnectService.getAPI();
    if (!api) throw new Error('API not initialized');

    console.log(`Creating BCF topic: ${title}`);
    // Simulate topic creation
    return { id: Math.random().toString(36).substring(7), title, status: 'Open' };
  }
}
