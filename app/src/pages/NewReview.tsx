import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, StageTemplate } from '../types'; // Import StageTemplate
import { addAuthHeader } from '../utils/api';

interface StageFormState {
  id: number;
  name: string;
  repositoryUrl: string;
  reviewerIds: string[];
}

function NewReview() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [stages, setStages] = useState<StageFormState[]>([
    { id: 1, name: '1st Round', repositoryUrl: '', reviewerIds: [] },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [stageTemplates, setStageTemplates] = useState<StageTemplate[]>([]); // New state for templates
  const [selectedTemplateId, setSelectedTemplateId] = useState(''); // New state for selected template
  const [allUsers, setAllUsers] = useState<User[]>([]); // New state for all users

  // Fetch all users on component mount
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
          repositoryUrl: '', // Repository URL is usually specific to the review, not template
          reviewerIds: s.reviewerIds,
        })));
      }
    } else {
      // If "Select a template" is chosen, clear stages
      setStages([{ id: Date.now(), name: '', repositoryUrl: '', reviewerIds: [] }]);
    }
  };

  const handleStageChange = (index: number, field: keyof StageFormState, value: any) => {
    const newStages = [...stages];
    newStages[index] = { ...newStages[index], [field]: value };
    setStages(newStages);
  };

  const addStage = () => {
    setStages([...stages, { id: Date.now(), name: '', repositoryUrl: '', reviewerIds: [] }]);
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
      repositoryUrl: stage.repositoryUrl,
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
        body: JSON.stringify({ title, stages: apiStages }),
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
              <label>リポジトリURL</label>
              <input
                type="text"
                value={stage.repositoryUrl}
                onChange={(e) => handleStageChange(index, 'repositoryUrl', e.target.value)}
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
