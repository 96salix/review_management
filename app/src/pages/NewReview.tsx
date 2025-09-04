import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { users } from '../data';
import { User } from '../types';

// A simplified version of the stage for the form state
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
      setError('Title is required.');
      return;
    }

    // Transform form state to the format expected by the API
    const apiStages = stages.map((stage, index) => ({
      id: String(Date.now() + index), // Temporary unique ID
      name: stage.name,
      repositoryUrl: stage.repositoryUrl,
      assignments: stage.reviewerIds.map(reviewerId => ({
        reviewer: users.find(u => u.id === reviewerId)!,
        status: 'pending' as const,
      })),
      comments: [],
    }));

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, stages: apiStages }),
      });

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
    <div>
      <h1>New Review Request</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>

        <h2>Stages</h2>
        {stages.map((stage, index) => (
          <div key={stage.id} style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h3>Stage {index + 1}</h3>
              {stages.length > 1 && <button type="button" onClick={() => removeStage(index)}>Remove</button>}
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <label>Stage Name</label>
              <input
                type="text"
                value={stage.name}
                onChange={(e) => handleStageChange(index, 'name', e.target.value)}
                style={{ width: '100%', padding: '0.5rem' }}
              />
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <label>Repository URL</label>
              <input
                type="text"
                value={stage.repositoryUrl}
                onChange={(e) => handleStageChange(index, 'repositoryUrl', e.target.value)}
                style={{ width: '100%', padding: '0.5rem' }}
              />
            </div>
            <div>
              <label>Reviewers</label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                {users.map(user => (
                  <label key={user.id}>
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

        <button type="button" onClick={addStage}>Add Stage</button>

        <hr style={{ margin: '2rem 0' }} />

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <button type="submit">Create Review Request</button>
      </form>
    </div>
  );
}

export default NewReview;
