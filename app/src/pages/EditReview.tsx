import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ReviewRequest, StageTemplate, User } from '../types'; // Import User
import { addAuthHeader } from '../utils/api';

interface StageFormState {
  id: string | number;
  name: string;
  repositoryUrl: string;
  reviewerIds: string[];
  reviewerCount: number;
  dueDate: string;
}

function EditReview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [stages, setStages] = useState<StageFormState[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [stageTemplates, setStageTemplates] = useState<StageTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);

  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        const response = await fetch('/api/users', addAuthHeader());
        if (!response.ok) throw new Error('Failed to fetch users');
        setAllUsers(await response.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred while fetching users');
      }
    };
    fetchAllUsers();
  }, []);

  useEffect(() => {
    const fetchStageTemplates = async () => {
      try {
        const response = await fetch('/api/stage-templates', addAuthHeader());
        if (!response.ok) throw new Error('Failed to fetch templates');
        setStageTemplates(await response.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred while fetching templates');
      }
    };
    fetchStageTemplates();
  }, []);

  useEffect(() => {
    const fetchReviewForEdit = async () => {
      try {
        const response = await fetch(`/api/reviews/${id}`, addAuthHeader());
        if (!response.ok) throw new Error('Review not found');
        const data: ReviewRequest = await response.json();
        setTitle(data.title);
        setUrl(data.url);
        setStages(data.stages.map(s => ({
          id: s.id,
          name: s.name,
          repositoryUrl: s.repositoryUrl,
          reviewerIds: s.assignments.map(a => a.reviewer.id),
          reviewerCount: s.reviewerCount || s.assignments.length,
          dueDate: s.dueDate ? new Date(s.dueDate).toISOString().split('T')[0] : '',
        })));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      }
    };
    if (id) {
        fetchReviewForEdit();
    }
  }, [id]);

  const handleTemplateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    setSelectedTemplateId(templateId);
    if (templateId) {
      const selectedTemplate = stageTemplates.find(t => t.id === templateId);
      if (selectedTemplate) {
        setStages(selectedTemplate.stages.map((s, index) => ({
          id: Date.now() + index,
          name: s.name,
          repositoryUrl: '',
          reviewerIds: s.reviewerIds,
          reviewerCount: s.reviewerIds.length,
          dueDate: ''
        })));
      }
    } else {
      setStages([]);
    }
  };

  const handleStageChange = (index: number, field: keyof StageFormState, value: any) => {
    const newStages = [...stages];
    newStages[index] = { ...newStages[index], [field]: value };
    setStages(newStages);
  };

  const addStage = () => {
    setStages([...stages, { id: Date.now(), name: '', repositoryUrl: '', reviewerIds: [], reviewerCount: 3, dueDate: '' }]);
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

    const apiStages = stages.map((stage) => ({
      id: String(stage.id),
      name: stage.name,
      repositoryUrl: stage.repositoryUrl,
      reviewerCount: stage.reviewerCount,
      dueDate: stage.dueDate || null,
      assignments: stage.reviewerIds.map(reviewerId => ({
        reviewer: allUsers.find(u => u.id === reviewerId)!,
        status: 'pending' as const,
      })),
      comments: [],
    }));

    try {
      const response = await fetch(`/api/reviews/${id}`, addAuthHeader({
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, url, stages: apiStages }),
      }));

      if (!response.ok) {
        throw new Error('Failed to update review request.');
      }

      navigate(`/reviews/${id}`);

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
      <h1>レビュー依頼を編集</h1>
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
          <label htmlFor="url">レビュー対象URL</label>
          <input
            id="url"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
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

        <button type="submit">更新</button>
      </form>
    </div>
  );
}

export default EditReview;
