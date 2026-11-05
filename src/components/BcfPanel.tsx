import React, { useState, useEffect } from 'react';
import { ModusButton, ModusCard } from './ui/NativeModusComponents';
import { BcfService } from '../services/BcfService';

export const BcfPanel: React.FC = () => {
  const [topics, setTopics] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const fetchTopics = async () => {
    try {
      const data = await BcfService.getTopics();
      setTopics(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, []);

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    try {
      const newTopic = await BcfService.createTopic(title, description);
      setTopics((prev) => [...prev, newTopic]);
      setTitle('');
      setDescription('');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h3>BCF Topics</h3>
      
      <form onSubmit={handleCreateTopic} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <input
          type="text"
          placeholder="Topic Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <textarea
          placeholder="Topic Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minHeight: '60px' }}
        />
        <ModusButton buttonStyle="primary" type="submit" disabled={!title}>
          Create Topic
        </ModusButton>
      </form>

      <hr />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h4>Existing Topics</h4>
        {topics.map((t) => (
          <ModusCard key={t.id} style={{ padding: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>{t.title}</strong>
              <span style={{
                background: t.status === 'Open' ? '#d4edda' : '#f8d7da',
                color: t.status === 'Open' ? '#155724' : '#721c24',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '10px'
              }}>{t.status}</span>
            </div>
            {t.description && <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>{t.description}</p>}
          </ModusCard>
        ))}
      </div>
    </div>
  );
};
