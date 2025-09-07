import { useState, useEffect } from 'react';
import { StageTemplate, User, TemplateStage } from '../types';
import { addAuthHeader } from '../utils/api';

// The form state for a single stage within the template UI
interface StageFormState {
  name: string;
  reviewerIds: string[];
  reviewerCount: number;
}

// The form state for the entire template (new or editing)
interface TemplateFormState {
  name: string;
  stages: StageFormState[];
  isDefault?: boolean;
}

function StageTemplateManagement() {
  const [templates, setTemplates] = useState<StageTemplate[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [newTemplate, setNewTemplate] = useState<TemplateFormState>({ name: '', stages: [{ name: '', reviewerIds: [], reviewerCount: 3 }], isDefault: false });
  const [editingTemplate, setEditingTemplate] = useState<(StageTemplate & { stages: StageFormState[] }) | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/stage-templates', addAuthHeader());
      if (!response.ok) throw new Error('Failed to fetch templates');
      const data: StageTemplate[] = await response.json();
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users', addAuthHeader());
      if (!response.ok) throw new Error('Failed to fetch users');
      setAllUsers(await response.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTemplates();
    fetchUsers();
  }, []);

  const handleStageChange = (stageIndex: number, field: keyof StageFormState, value: any) => {
    const isEditing = !!editingTemplate;
    const targetTemplate = isEditing ? editingTemplate : newTemplate;
    const newStages = [...targetTemplate.stages];
    newStages[stageIndex] = { ...newStages[stageIndex], [field]: value };

    if (isEditing) {
      setEditingTemplate({ ...editingTemplate, stages: newStages });
    } else {
      setNewTemplate({ ...newTemplate, stages: newStages });
    }
  };

  const handleReviewerChange = (stageIndex: number, reviewerId: string) => {
    const isEditing = !!editingTemplate;
    const targetTemplate = isEditing ? editingTemplate : newTemplate;
    const newStages = [...targetTemplate.stages];
    const currentReviewers = newStages[stageIndex].reviewerIds;

    if (currentReviewers.includes(reviewerId)) {
      newStages[stageIndex].reviewerIds = currentReviewers.filter(id => id !== reviewerId);
    } else {
      newStages[stageIndex].reviewerIds.push(reviewerId);
    }

    if (isEditing) {
      setEditingTemplate({ ...editingTemplate, stages: newStages });
    } else {
      setNewTemplate({ ...newTemplate, stages: newStages });
    }
  };

  const addStage = () => {
    const isEditing = !!editingTemplate;
    const targetTemplate = isEditing ? editingTemplate : newTemplate;
    const newStages = [...targetTemplate.stages, { name: '', reviewerIds: [], reviewerCount: 3 }];

    if (isEditing) {
      setEditingTemplate({ ...editingTemplate, stages: newStages });
    } else {
      setNewTemplate({ ...newTemplate, stages: newStages });
    }
  };

  const removeStage = (stageIndex: number) => {
    const isEditing = !!editingTemplate;
    const targetTemplate = isEditing ? editingTemplate : newTemplate;
    const newStages = targetTemplate.stages.filter((_, i) => i !== stageIndex);

    if (isEditing) {
      setEditingTemplate({ ...editingTemplate, stages: newStages });
    } else {
      setNewTemplate({ ...newTemplate, stages: newStages });
    }
  };

  const handleRandomAssign = (stageIndex: number) => {
    const isEditing = !!editingTemplate;
    const targetTemplate = isEditing ? editingTemplate : newTemplate;
    const stage = targetTemplate.stages[stageIndex];

    if (stage.reviewerCount > allUsers.length) {
      setError('レビュアー数が全ユーザー数を超えています。');
      return;
    }
    const shuffled = [...allUsers].sort(() => 0.5 - Math.random());
    const selectedReviewerIds = shuffled.slice(0, stage.reviewerCount).map(user => user.id);
    handleStageChange(stageIndex, 'reviewerIds', selectedReviewerIds);
  };

  const applyToAllStages = (stageIndex: number) => {
    const isEditing = !!editingTemplate;
    const targetTemplate = isEditing ? editingTemplate : newTemplate;
    const sourceReviewerIds = targetTemplate.stages[stageIndex].reviewerIds;
    const newStages = targetTemplate.stages.map(stage => ({ ...stage, reviewerIds: [...sourceReviewerIds] }));

    if (isEditing) {
      setEditingTemplate({ ...editingTemplate, stages: newStages });
    } else {
      setNewTemplate({ ...newTemplate, stages: newStages });
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const isEditing = !!editingTemplate;
    const targetTemplate = isEditing ? editingTemplate : newTemplate;

    if (!targetTemplate.name.trim()) {
      setError('テンプレート名は必須です。');
      return;
    }

    const apiData = {
      name: targetTemplate.name,
      stages: targetTemplate.stages.map(s => ({
        name: s.name,
        reviewerIds: s.reviewerIds,
        reviewerCount: s.reviewerCount,
      })),
      isDefault: targetTemplate.isDefault,
    };

    try {
      const url = isEditing ? `/api/stage-templates/${editingTemplate.id}` : '/api/stage-templates';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, addAuthHeader({
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData),
      }));

      if (!response.ok) throw new Error(`Failed to ${isEditing ? 'update' : 'add'} template`);

      setEditingTemplate(null);
      setNewTemplate({ name: '', stages: [{ name: '', reviewerIds: [], reviewerCount: 3 }], isDefault: false });
      fetchTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  const handleEditTemplate = (template: StageTemplate) => {
    setEditingTemplate({
      ...template,
      stages: template.stages.map(s => ({
        name: s.name,
        reviewerIds: s.reviewerIds,
        reviewerCount: s.reviewerCount || s.reviewerIds.length || 3,
      })),
    });
  };

  const handleDeleteTemplate = async (id: string) => {
    setError(null);
    if (!window.confirm('本当にこのテンプレートを削除しますか？')) return;
    try {
      const response = await fetch(`/api/stage-templates/${id}`, addAuthHeader({ method: 'DELETE' }));
      if (!response.ok) throw new Error('Failed to delete template');
      fetchTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  const handleSetDefault = async (id: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/stage-templates/${id}/default`, addAuthHeader({ method: 'PUT' }));
      if (!response.ok) throw new Error('Failed to set default template');
      fetchTemplates(); // Refresh the list to show the new default
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  const currentForm = editingTemplate || newTemplate;

  return (
    <div className="card">
      <h1>ステージテンプレート管理</h1>
      {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}

      <div style={{ marginBottom: '2rem' }}>
        <h2>{editingTemplate ? 'テンプレートを編集' : '新しいテンプレートを追加'}</h2>
        <form onSubmit={handleSaveTemplate}>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="templateName">テンプレート名</label>
            <input
              id="templateName"
              type="text"
              value={currentForm.name}
              onChange={(e) => {
                const newName = e.target.value;
                if (editingTemplate) {
                  setEditingTemplate({ ...editingTemplate, name: newName });
                } else {
                  setNewTemplate({ ...newTemplate, name: newName });
                }
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={!!currentForm.isDefault}
                onChange={(e) => {
                  const newIsDefault = e.target.checked;
                  if (editingTemplate) {
                    setEditingTemplate({ ...editingTemplate, isDefault: newIsDefault });
                  } else {
                    setNewTemplate({ ...newTemplate, isDefault: newIsDefault });
                  }
                }}
              />
              デフォルトのテンプレートとして設定
            </label>
          </div>

          <h3>ステージ設定</h3>
          {currentForm.stages.map((stage, stageIndex) => (
            <div key={stageIndex} className="card" style={{ background: '#f8f9fa', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4>ステージ {stageIndex + 1}</h4>
                {currentForm.stages.length > 1 && <button type="button" onClick={() => removeStage(stageIndex)}>削除</button>}
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label>ステージ名</label>
                <input
                  type="text"
                  value={stage.name}
                  onChange={(e) => handleStageChange(stageIndex, 'name', e.target.value)}
                />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                  <label>レビュアー</label>
                  <input
                    type="number"
                    value={stage.reviewerCount}
                    onChange={(e) => handleStageChange(stageIndex, 'reviewerCount', parseInt(e.target.value, 10) || 0)}
                    min="0"
                    style={{ width: '50px' }}
                  />
                  <button type="button" onClick={() => handleRandomAssign(stageIndex)}>ランダム割り当て</button>
                  {stageIndex === 0 && currentForm.stages.length > 1 && (
                    <button type="button" onClick={() => applyToAllStages(stageIndex)}>全ステージに反映</button>
                  )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                  {allUsers.map(user => (
                    <label key={user.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'normal' }}>
                      <input
                        type="checkbox"
                        checked={stage.reviewerIds.includes(user.id)}
                        onChange={() => handleReviewerChange(stageIndex, user.id)}
                      />
                      {user.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={addStage} style={{ marginBottom: '1.5rem' }}>ステージを追加</button>

          <button type="submit">{editingTemplate ? '更新' : '追加'}</button>
          {editingTemplate && <button type="button" onClick={() => { setEditingTemplate(null); setNewTemplate({ name: '', stages: [{ name: '', reviewerIds: [], reviewerCount: 3 }], isDefault: false }); }} style={{ marginLeft: '0.5rem' }}>キャンセル</button>}
        </form>
      </div>

      <h2>既存テンプレート</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {templates.map(template => (
          <li key={template.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem', border: '1px solid var(--border-color)', padding: '0.5rem', borderRadius: 'var(--border-radius)' }}>
            <span style={{ flex: 1 }}>
              {template.name}
              {template.isDefault && <span style={{ marginLeft: '0.5rem', padding: '2px 6px', background: '#007bff', color: 'white', borderRadius: '4px', fontSize: '0.8em' }}>デフォルト</span>}
            </span>
            {!template.isDefault && <button type="button" onClick={() => handleSetDefault(template.id)} style={{ marginLeft: '0.5rem' }}>デフォルトに設定</button>}
            <button type="button" onClick={() => handleEditTemplate(template)} style={{ marginLeft: '0.5rem' }}>編集</button>
            <button type="button" onClick={() => handleDeleteTemplate(template.id)} style={{ marginLeft: '0.5rem', backgroundColor: '#dc3545' }}>削除</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default StageTemplateManagement;
