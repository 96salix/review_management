import { useState, useEffect } from 'react';
import { StageTemplate, User } from '../types';

interface StageFormState {
  name: string;
  reviewerIds: string[];
}

function StageTemplateManagement() {
  const [templates, setTemplates] = useState<StageTemplate[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [newTemplate, setNewTemplate] = useState({ name: '', stages: [{ name: '', reviewerIds: [] }] });
  const [editingTemplate, setEditingTemplate] = useState<StageTemplate | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/stage-templates');
      if (!response.ok) throw new Error('Failed to fetch templates');
      const data = await response.json();
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setAllUsers(data);
    } catch (err) {
      // Non-critical error, maybe just log it
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTemplates();
    fetchUsers();
  }, []);

  const handleTemplateStageChange = (templateIndex: number, stageIndex: number, field: keyof StageFormState, value: any) => {
    const targetTemplate = editingTemplate || newTemplate;
    const newStages = [...targetTemplate.stages];
    newStages[stageIndex] = { ...newStages[stageIndex], [field]: value };
    if (editingTemplate) {
      setEditingTemplate({ ...editingTemplate, stages: newStages });
    } else {
      setNewTemplate({ ...newTemplate, stages: newStages });
    }
  };

  const handleTemplateReviewerChange = (templateIndex: number, stageIndex: number, reviewerId: string) => {
    const targetTemplate = editingTemplate || newTemplate;
    const newStages = [...targetTemplate.stages];
    const currentReviewers = newStages[stageIndex].reviewerIds;
    if (currentReviewers.includes(reviewerId)) {
      newStages[stageIndex].reviewerIds = currentReviewers.filter(id => id !== reviewerId);
    } else {
      newStages[stageIndex].reviewerIds.push(reviewerId);
    }
    if (editingTemplate) {
      setEditingTemplate({ ...editingTemplate, stages: newStages });
    } else {
      setNewTemplate({ ...newTemplate, stages: newStages });
    }
  };

  const addTemplateStage = () => {
    const targetTemplate = editingTemplate || newTemplate;
    const newStages = [...targetTemplate.stages, { name: '', reviewerIds: [] }];
    if (editingTemplate) {
      setEditingTemplate({ ...editingTemplate, stages: newStages });
    } else {
      setNewTemplate({ ...newTemplate, stages: newStages });
    }
  };

  const removeTemplateStage = (stageIndex: number) => {
    const targetTemplate = editingTemplate || newTemplate;
    const newStages = targetTemplate.stages.filter((_, i) => i !== stageIndex);
    if (editingTemplate) {
      setEditingTemplate({ ...editingTemplate, stages: newStages });
    } else {
      setNewTemplate({ ...newTemplate, stages: newStages });
    }
  };

  const handleAddTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!newTemplate.name.trim()) {
      setError('テンプレート名は必須です。');
      return;
    }
    try {
      const response = await fetch('/api/stage-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplate),
      });
      if (!response.ok) throw new Error('Failed to add template');
      setNewTemplate({ name: '', stages: [{ name: '', reviewerIds: [] }] });
      fetchTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  const handleEditTemplate = (template: StageTemplate) => {
    setEditingTemplate(template);
    setNewTemplate({ name: template.name, stages: template.stages.map(s => ({ name: s.name, reviewerIds: s.reviewerIds })) });
  };

  const handleUpdateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!editingTemplate || !editingTemplate.name.trim()) {
      setError('テンプレート名は必須です。');
      return;
    }
    try {
      const response = await fetch(`/api/stage-templates/${editingTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTemplate),
      });
      if (!response.ok) throw new Error('Failed to update template');
      setEditingTemplate(null);
      setNewTemplate({ name: '', stages: [{ name: '', reviewerIds: [] }] });
      fetchTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    setError(null);
    if (!window.confirm('本当にこのテンプレートを削除しますか？')) return;
    try {
      const response = await fetch(`/api/stage-templates/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete template');
      fetchTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  const currentFormStages = editingTemplate ? editingTemplate.stages : newTemplate.stages;

  return (
    <div className="card">
      <h1>ステージテンプレート管理</h1>
      {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}

      <div style={{ marginBottom: '2rem' }}>
        <h2>{editingTemplate ? 'テンプレートを編集' : '新しいテンプレートを追加'}</h2>
        <form onSubmit={editingTemplate ? handleUpdateTemplate : handleAddTemplate}>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="templateName">テンプレート名</label>
            <input
              id="templateName"
              type="text"
              value={editingTemplate ? editingTemplate.name : newTemplate.name}
              onChange={(e) => {
                if (editingTemplate) {
                  setEditingTemplate({ ...editingTemplate, name: e.target.value });
                } else {
                  setNewTemplate({ ...newTemplate, name: e.target.value });
                }
              }}
            />
          </div>

          <h3>ステージ設定</h3>
          {currentFormStages.map((stage, stageIndex) => (
            <div key={stageIndex} className="card" style={{ background: '#f8f9fa', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4>ステージ {stageIndex + 1}</h4>
                {currentFormStages.length > 1 && <button type="button" onClick={() => removeTemplateStage(stageIndex)}>削除</button>}
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label>ステージ名</label>
                <input
                  type="text"
                  value={stage.name}
                  onChange={(e) => handleTemplateStageChange(0, stageIndex, 'name', e.target.value)}
                />
              </div>
              <div>
                <label>レビュアー</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                  {allUsers.map(user => (
                    <label key={user.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'normal' }}>
                      <input
                        type="checkbox"
                        checked={stage.reviewerIds.includes(user.id)}
                        onChange={() => handleTemplateReviewerChange(0, stageIndex, user.id)}
                      />
                      {user.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={addTemplateStage} style={{ marginBottom: '1.5rem' }}>ステージを追加</button>

          <button type="submit">{editingTemplate ? '更新' : '追加'}</button>
          {editingTemplate && <button type="button" onClick={() => { setEditingTemplate(null); setNewTemplate({ name: '', stages: [{ name: '', reviewerIds: [] }] }); }} style={{ marginLeft: '0.5rem' }}>キャンセル</button>}
        </form>
      </div>

      <h2>既存テンプレート</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {templates.map(template => (
          <li key={template.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem', border: '1px solid var(--border-color)', padding: '0.5rem', borderRadius: 'var(--border-radius)' }}>
            <span style={{ flex: 1 }}>{template.name} ({template.stages.length} ステージ)</span>
            <button type="button" onClick={() => handleEditTemplate(template)}>編集</button>
            <button type="button" onClick={() => handleDeleteTemplate(template.id)} style={{ marginLeft: '0.5rem', backgroundColor: '#dc3545' }}>削除</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default StageTemplateManagement;
