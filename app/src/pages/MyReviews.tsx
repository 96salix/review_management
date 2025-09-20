import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ReviewRequest, ReviewAssignment, ReviewStage, ReviewStatusValue } from '../types';

import StatusSelector from '../components/StatusSelector'; // Import StatusSelector
import { addAuthHeader } from '../utils/api';

const LIMIT = 10;

function MyReviews() {
  const [reviews, setReviews] = useState<ReviewRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const storedUserId = localStorage.getItem('currentUserId');
    if (storedUserId) {
      setCurrentUserId(storedUserId);
    }
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    const fetchMyReviews = async () => {
      try {
        const response = await fetch(`/api/reviews/my?sortBy=${sortBy}&order=${order}&page=${currentPage}&limit=${LIMIT}`, addAuthHeader());
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        setReviews(data.reviews);
        setTotalCount(data.totalCount);
      } catch (error) {
        if (error instanceof Error) {
            setError(error.message);
        } else {
            setError('An unknown error occurred');
        }
      }
    };

    fetchMyReviews();
  }, [currentUserId, sortBy, order, currentPage]);

  const handleStatusChange = async (reviewId: string, stageId: string, newStatus: ReviewStatusValue) => {
    try {
        const response = await fetch(`/api/reviews/${reviewId}/stages/${stageId}/assignments/${currentUserId}`, addAuthHeader({
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
        }));
        if (!response.ok) throw new Error('Failed to update status');
        // Instead, update the state directly
        setReviews(prevReviews => {
            return prevReviews.map(review => {
                if (review.id === reviewId) {
                    return {
                        ...review,
                        stages: review.stages.map(stage => {
                            if (stage.id === stageId) {
                                return {
                                    ...stage,
                                    assignments: stage.assignments.map(assign => {
                                        if (assign.reviewer.id === currentUserId) {
                                            return { ...assign, status: newStatus };
                                        }
                                        return assign;
                                    })
                                };
                            }
                            return stage;
                        })
                    };
                }
                return review;
            });
        });
    } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  const totalPages = Math.ceil(totalCount / LIMIT);

  if (error) {
    return <div className="card" style={{ color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>自分のレビュー</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="createdAt">作成日</option>
            <option value="dueDate">期日</option>
          </select>
          <select value={order} onChange={e => setOrder(e.target.value)}>
            <option value="desc">降順</option>
            <option value="asc">昇順</option>
          </select>
        </div>
      </div>
      <div>
        {reviews.length > 0 ? reviews.map(review => {
          const myAssignments = review.stages
            .flatMap(stage => stage.assignments.map(assignment => ({ stage, assignment })))
            .filter(({ assignment }) => assignment.reviewer.id === currentUserId);

          const nearestDueDate = review.stages
            .map(s => s.dueDate)
            .filter(Boolean)
            .map(d => new Date(d!))
            .sort((a, b) => a.getTime() - b.getTime())[0];

          return (
            <div key={review.id} className={`card ${myAssignments.every(a => a.assignment.status === 'lgtm') ? 'lgtm-card' : ''}`}>
              <h2 style={{ marginBottom: '1rem' }}>
                  <Link to={`/reviews/${review.id}`}>{review.title}</Link>
              </h2>
              <p style={{ margin: 0, color: 'var(--secondary-color)' }}>
                  依頼者: <strong>{review.author.name}</strong> / 作成日: {new Date(review.createdAt).toLocaleDateString()}
                  {nearestDueDate && ` / 期日: ${new Date(nearestDueDate).toLocaleDateString()}`}
              </p>
              {myAssignments.map(({ stage, assignment }) => (
                <div key={stage.id} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                          <p style={{ margin: 0 }}><strong>ステージ:</strong> {stage.name}</p>
                          {stage.dueDate && <p style={{ margin: '0.5rem 0 0 0', color: 'var(--secondary-color)' }}>期日: {new Date(stage.dueDate).toLocaleDateString()}</p>}
                          <p style={{ margin: '0.5rem 0' }}>
                              <strong>URL:</strong> <a href={stage.repositoryUrl} target="_blank" rel="noopener noreferrer">{stage.repositoryUrl}</a>
                          </p>
                      </div>
                      <div>
                          <label><strong>自分のステータス:</strong></label>
                          <StatusSelector 
                              currentStatus={assignment.status} 
                              onStatusChange={(newStatus) => handleStatusChange(review.id, stage.id, newStatus)} 
                          />
                      </div>
                  </div>
                </div>
              ))}
            </div>
          );
        }) : <p>担当するレビューはありません。</p>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '1rem' }}>
        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
          前へ
        </button>
        <span style={{ margin: '0 1rem' }}>
          {currentPage} / {totalPages}
        </span>
        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
          次へ
        </button>
      </div>
    </div>
  );
}

export default MyReviews;
