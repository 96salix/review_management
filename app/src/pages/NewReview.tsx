import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, StageTemplate, GlobalSettings } from '../types'; // Import StageTemplate
import { addAuthHeader } from '../utils/api';

interface StageFormState {
  id: number;
  name: string;
  targetUrl: string;
  reviewerIds: string[];
  reviewerCount: number;
  dueDate: string;
}

function NewReview() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [descriptionUrl, setDescriptionUrl] = useState('');
  const [stages, setStages] = useState<StageFormState[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [stageTemplates, setStageTemplates] = useState<StageTemplate[]>([]); // New state for templates
  const [selectedTemplateId, setSelectedTemplateId] = useState(''); // New state for selected template
  const [allUsers, setAllUsers] = useState<User[]>([]); // New state for all users
  const [settings, setSettings] = useState<GlobalSettings | null>(null);

  // Fetch all users and settings on component mount
  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        const response = await fetch('/api/users', addAuthHeader());
        if (!response.ok) throw new Error('Failed to fetch users');
        const data = await response.json();
        setAllUsers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred while fetching users');
      }
    };
    fetchAllUsers();

    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings', addAuthHeader());
        if (!response.ok) throw new Error('Failed to fetch settings');
        const data = await response.json();
        setSettings(data);
      } catch (err) {
        console.error('Failed to fetch settings', err);
      }
    };
    fetchSettings();
  }, []);

  // Fetch stage templates on component mount
  useEffect(() => {
    const fetchStageTemplates = async () => {
      try {
        const response = await fetch('/api/stage-templates', addAuthHeader());
        if (!response.ok) throw new Error('Failed to fetch templates');
        const data = await response.json();
        setStageTemplates(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred while fetching templates');
      }
    };
    fetchStageTemplates();
  }, []);

  // Set initial stage after settings are loaded
  useEffect(() => {
    if (settings && stages.length === 0 && !selectedTemplateId) {
      setStages([
        { id: 1, name: '1st Round', targetUrl: '', reviewerIds: [], reviewerCount: settings.defaultReviewerCount || 0, dueDate: '' },
      ]);
    }
  }, [settings, stages.length, selectedTemplateId]);

  // Apply default template once templates are loaded
  useEffect(() => {
    if (stageTemplates.length > 0 && !selectedTemplateId) {
      const defaultTemplate = stageTemplates.find(t => t.isDefault);
      if (defaultTemplate) {
        setSelectedTemplateId(defaultTemplate.id);
        // Apply template stages to the form
        setStages(defaultTemplate.stages.map((s, index) => ({
          id: Date.now() + index, // Generate new unique ID for form state
          name: s.name,
          repositoryUrl: '', // Repository URL is usually specific to the review, not template
          reviewerIds: s.reviewerIds,
          reviewerCount: s.reviewerCount || s.reviewerIds.length || settings?.defaultReviewerCount || 3,
          dueDate: ''
        })));
      }
    }
  }, [stageTemplates, settings]);

  const handleTemplateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    setSelectedTemplateId(templateId);
    if (templateId) {
      const selectedTemplate = stageTemplates.find(t => t.id === templateId);
      if (selectedTemplate) {
        // Apply template stages to the form
        setStages(selectedTemplate.stages.map((s, index) => ({
          id: Date.now() + index, // Generate new unique ID for form state
          name: s.name,
          targetUrl: '', // Repository URL is usually specific to the review, not template
          reviewerIds: s.reviewerIds,
          reviewerCount: s.reviewerIds.length,
          dueDate: ''
        })));
      }
    } else {
      // If "Select a template" is chosen, clear stages
      setStages([{ id: Date.now(), name: '', targetUrl: '', reviewerIds: [], reviewerCount: settings?.defaultReviewerCount || 0, dueDate: '' }]);
    }
  };

  const handleStageChange = (index: number, field: keyof StageFormState, value: any) => {
    const newStages = [...stages];
    newStages[index] = { ...newStages[index], [field]: value };
    setStages(newStages);
  };

  const addStage = () => {
    setStages([...stages, { id: Date.now(), name: '', targetUrl: '', reviewerIds: [], reviewerCount: settings?.defaultReviewerCount || 3, dueDate: '' }]);
  };

  const removeStage = (index: number) => {
    setStages(stages.filter((_, i) => i !== index));
  };

  const handleReviewerChange = (stageIndex: number, reviewerId: string) => {
    const newStages = [...stages];
    const currentReviewers = newStages[stageIndex].reviewerIds;
    if (currentReviewers.includes(reviewerId)) {
      newStages[stageIndex].reviewerIds = currentReviewers.filter(id => id !== reviewerId);
    } else {
      newStages[stageIndex].reviewerIds.push(reviewerId);
    }
    setStages(newStages);
  };

  const handleRandomAssign = (stageIndex: number) => {
    const stage = stages[stageIndex];
    if (stage.reviewerCount > allUsers.length) {
      setError('レビュアー数が全ユーザー数を超えています。');
      return;
    }
    const shuffled = [...allUsers].sort(() => 0.5 - Math.random());
    const selectedReviewerIds = shuffled.slice(0, stage.reviewerCount).map(user => user.id);
    handleStageChange(stageIndex, 'reviewerIds', selectedReviewerIds);
  };

  const applyToAllStages = (stageIndex: number) => {
    const sourceReviewerIds = stages[stageIndex].reviewerIds;
    const newStages = stages.map(stage => ({
      ...stage,
      reviewerIds: [...sourceReviewerIds],
    }));
    setStages(newStages);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('タイトルは必須です。');
      return;
    }

    const apiStages = stages.map((stage, index) => ({
      id: String(Date.now() + index), // Temporary unique ID
      name: stage.name,
      targetUrl: stage.targetUrl,
      reviewerCount: stage.reviewerCount,
      dueDate: stage.dueDate || null,
      assignments: stage.reviewerIds.map(reviewerId => ({
        reviewer: allUsers.find(u => u.id === reviewerId)!,
        status: 'pending' as const,
      })),
      comments: [],
    }));

    try {
      const response = await fetch('/api/reviews', addAuthHeader({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, descriptionUrl, stages: apiStages }),
      }));

      if (!response.ok) {
        throw new Error('Failed to create review request.');
      }

      const newReview = await response.json();
      navigate(`/reviews/${newReview.id}`);

    } catch (err) {
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError('An unknown error occurred.');
        }
    }
  };

  return (
    <div className="card">
      <h1>新規レビュー依頼</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="title">タイトル</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="descriptionUrl">対象案件の概要/リンク</label>
          <input
            id="descriptionUrl"
            type="text"
            value={descriptionUrl}
            onChange={(e) => setDescriptionUrl(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="templateSelect">テンプレートからステージを適用</label>
          <select
            id="templateSelect"
            value={selectedTemplateId}
            onChange={handleTemplateSelect}
          >
            <option value="">テンプレートを選択...</option>
            {stageTemplates.map(template => (
              <option key={template.id} value={template.id}>{template.name}</option>
            ))}
          </select>
        </div>

        <h2>ステージ</h2>
        {stages.map((stage, index) => (
          <div key={stage.id} className="card" style={{ background: '#f8f9fa' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>ステージ {index + 1}</h3>
              {stages.length > 1 && <button type="button" onClick={() => removeStage(index)}>削除</button>}
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <label>ステージ名</label>
              <input
                type="text"
                value={stage.name}
                onChange={(e) => handleStageChange(index, 'name', e.target.value)}
              />
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <label>レビュー対象</label>
              <input
                type="text"
                value={stage.targetUrl}
                onChange={(e) => handleStageChange(index, 'targetUrl', e.target.value)}
              />
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <label>期日</label>
              <input
                type="date"
                value={stage.dueDate}
                onChange={(e) => handleStageChange(index, 'dueDate', e.target.value)}
              />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                <label>レビュアー</label>
                <input
                  type="number"
                  value={stage.reviewerCount}
                  onChange={(e) => handleStageChange(index, 'reviewerCount', parseInt(e.target.value, 10) || 0)}
                  min="0"
                  style={{ width: '50px' }}
                />
                <button type="button" onClick={() => handleRandomAssign(index)}>ランダム割り当て</button>
                {index === 0 && stages.length > 1 && (
                  <button type="button" onClick={() => applyToAllStages(index)}>全ステージに反映</button>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                {allUsers.map(user => (
                  <label key={user.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'normal' }}>
                    <input
                      type="checkbox"
                      checked={stage.reviewerIds.includes(user.id)}
                      onChange={() => handleReviewerChange(index, user.id)}
                    />
                    {user.name}
                  </label>
                ))}
              </div>
            </div>
          </div>
        ))}

        <button type="button" onClick={addStage} style={{ marginBottom: '1.5rem' }}>ステージを追加</button>

        {error && <p style={{ color: 'red', marginBottom: '1.5rem' }}>{error}</p>}

        <button type="submit">レビュー依頼を作成</button>
      </form>
    </div>
  );
}

export default NewReview;