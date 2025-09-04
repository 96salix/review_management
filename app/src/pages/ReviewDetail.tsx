import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ReviewRequest, ReviewStatusValue } from '../types';

function ReviewDetail() {
  const { id } = useParams<{ id: string }>();
  const [review, setReview] = useState<ReviewRequest | null>(null);
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');

  const fetchReview = async () => {
    try {
      const response = await fetch(`/api/reviews/${id}`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      setReview(data);
      if (!activeStageId && data.stages && data.stages.length > 0) {
        setActiveStageId(data.stages[0].id);
      }
    } catch (error) {
      if (error instanceof Error) {
          setError(error.message);
      } else {
          setError('An unknown error occurred');
      }
    }
  };

  useEffect(() => {
    if (id) {
      fetchReview();
    }
  }, [id]);

  const handleStatusChange = async (reviewerId: string, newStatus: ReviewStatusValue) => {
    if (!review || !activeStage) return;
    try {
        const response = await fetch(`/api/reviews/${review.id}/stages/${activeStage.id}/assignments/${reviewerId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
        });
        if (!response.ok) throw new Error('Failed to update status');
        const updatedReview = await response.json();
        setReview(updatedReview);
    } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!review || !activeStage || !newComment.trim()) return;
    try {
        const response = await fetch(`/api/reviews/${review.id}/stages/${activeStage.id}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: newComment }),
        });
        if (!response.ok) throw new Error('Failed to post comment');
        const updatedReview = await response.json();
        setReview(updatedReview);
        setNewComment('');
    } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  if (error) return <div className="card" style={{ color: 'red' }}>Error: {error}</div>;
  if (!review) return <div>Loading...</div>;

  const activeStage = review.stages.find(s => s.id === activeStageId);

  return (
    <div className="card">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ marginBottom: '0.25rem' }}>{review.title}</h1>
        <p style={{ margin: 0, color: 'var(--secondary-color)' }}>
            Opened by <strong>{review.author.name}</strong> on {new Date(review.createdAt).toLocaleString()}
        </p>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
        {review.stages.map(stage => (
          <button
            key={stage.id}
            onClick={() => setActiveStageId(stage.id)}
            style={{
              padding: '1rem',
              border: 'none',
              borderBottom: activeStageId === stage.id ? '3px solid var(--primary-color)' : '3px solid transparent',
              background: 'transparent',
              cursor: 'pointer',
              color: activeStageId === stage.id ? 'var(--primary-color)' : 'var(--text-color)',
              fontWeight: activeStageId === stage.id ? '600' : 'normal'
            }}
          >
            {stage.name}
          </button>
        ))}
      </div>

      {activeStage && (
        <div>
          <div style={{ marginBottom: '2rem' }}>
            <h3>Reviewers</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {activeStage.assignments.map(assignment => (
                <li key={assignment.reviewer.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <img src={assignment.reviewer.avatarUrl} alt={assignment.reviewer.name} style={{ width: '32px', height: '32px', borderRadius: '50%', marginRight: '0.75rem' }} />
                  <span style={{ flex: 1 }}>{assignment.reviewer.name}</span>
                  <select
                      value={assignment.status}
                      onChange={(e) => handleStatusChange(assignment.reviewer.id, e.target.value as ReviewStatusValue)}
                  >
                      <option value="pending">Pending</option>
                      <option value="reviewing">Reviewing</option>
                      <option value="commented">Commented</option>
                      <option value="approved">Approved</option>
                  </select>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3>Comments</h3>
            <div style={{ marginBottom: '1.5rem' }}>
              {activeStage.comments.length > 0 ? activeStage.comments.map(comment => (
                <div key={comment.id} style={{ display: 'flex', marginBottom: '1rem' }}>
                  <img src={comment.author.avatarUrl} alt={comment.author.name} style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '1rem' }} />
                  <div style={{ flex: 1, background: '#f1f1f1', padding: '1rem', borderRadius: 'var(--border-radius)' }}>
                    <p style={{ margin: 0, fontWeight: '600' }}>
                      {comment.author.name}
                      <span style={{ color: 'var(--secondary-color)', fontWeight: 'normal', marginLeft: '0.5rem' }}>
                        commented at {new Date(comment.createdAt).toLocaleString()}
                      </span>
                    </p>
                    {comment.lineNumber && <p style={{ margin: '0.5rem 0 0', color: 'var(--secondary-color)' }}>Line: {comment.lineNumber}</p>}
                    <p style={{ margin: '0.5rem 0 0' }}>{comment.content}</p>
                  </div>
                </div>
              )) : <p>No comments yet.</p>}
            </div>
            <form onSubmit={handleCommentSubmit} style={{ display: 'flex' }}>
                <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    rows={3}
                />
                <button type="submit" style={{ marginLeft: '1rem', alignSelf: 'flex-start' }}>Post</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReviewDetail;
