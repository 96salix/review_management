import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ReviewRequest, ReviewStage, ReviewAssignment, Comment, ReviewStatusValue } from '../types';

function ReviewDetail() {
  const { id } = useParams<{ id: string }>();
  const [review, setReview] = useState<ReviewRequest | null>(null);
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    const fetchReview = async () => {
      try {
        const response = await fetch(`/api/reviews/${id}`);
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        setReview(data);
        if (data.stages && data.stages.length > 0) {
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

    if (id) {
      fetchReview();
    }
  }, [id]);

  const handleStatusChange = async (reviewerId: string, newStatus: ReviewStatusValue) => {
    if (!review || !activeStage) return;

    try {
        const response = await fetch(`/api/reviews/${review.id}/stages/${activeStage.id}/assignments/${reviewerId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: newStatus }),
        });

        if (!response.ok) {
            throw new Error('Failed to update status');
        }

        const updatedReview = await response.json();
        setReview(updatedReview);

    } catch (error) {
        if (error instanceof Error) {
            setError(error.message);
        } else {
            setError('An unknown error occurred while updating status');
        }
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!review || !activeStage || !newComment.trim()) return;

    try {
        const response = await fetch(`/api/reviews/${review.id}/stages/${activeStage.id}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content: newComment }),
        });

        if (!response.ok) {
            throw new Error('Failed to post comment');
        }

        const updatedReview = await response.json();
        setReview(updatedReview);
        setNewComment(''); // Clear the textarea

    } catch (error) {
        if (error instanceof Error) {
            setError(error.message);
        } else {
            setError('An unknown error occurred while posting comment');
        }
    }
  };

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!review) {
    return <div>Loading...</div>;
  }

  const activeStage = review.stages.find(s => s.id === activeStageId);

  return (
    <div>
      <h1>{review.title}</h1>
      <p>Author: {review.author.name}</p>
      <p>Created at: {new Date(review.createdAt).toLocaleString()}</p>

      <div style={{ display: 'flex', borderBottom: '1px solid #ccc' }}>
        {review.stages.map(stage => (
          <button
            key={stage.id}
            onClick={() => setActiveStageId(stage.id)}
            style={{
              padding: '1rem',
              border: 'none',
              background: activeStageId === stage.id ? '#eee' : 'transparent',
              cursor: 'pointer'
            }}
          >
            {stage.name}
          </button>
        ))}
      </div>

      {activeStage && (
        <div style={{ paddingTop: '1rem' }}>
          <h3>Reviewers</h3>
          <ul>
            {activeStage.assignments.map(assignment => (
              <li key={assignment.reviewer.id}>
                {assignment.reviewer.name}:
                <select
                    value={assignment.status}
                    onChange={(e) => handleStatusChange(assignment.reviewer.id, e.target.value as ReviewStatusValue)}
                    style={{ marginLeft: '0.5rem' }}
                >
                    <option value="pending">Pending</option>
                    <option value="reviewing">Reviewing</option>
                    <option value="commented">Commented</option>
                    <option value="approved">Approved</option>
                </select>
              </li>
            ))}
          </ul>

          <h3>Comments</h3>
          <div>
            {activeStage.comments.map(comment => (
              <div key={comment.id} style={{ border: '1px solid #eee', padding: '0.5rem', marginBottom: '0.5rem' }}>
                <p><strong>{comment.author.name}</strong> at {new Date(comment.createdAt).toLocaleString()}</p>
                {comment.lineNumber && <p>Line: {comment.lineNumber}</p>}
                <p>{comment.content}</p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '1rem' }}>
            <form onSubmit={handleCommentSubmit}>
                <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    rows={4}
                    style={{ width: '100%', padding: '0.5rem' }}
                />
                <button type="submit" style={{ marginTop: '0.5rem' }}>Post Comment</button>
            </form>
          </div>

        </div>
      )}
    </div>
  );
}

export default ReviewDetail;
