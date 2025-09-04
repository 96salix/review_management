import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ReviewRequest, ReviewAssignment, ReviewStage, ReviewStatusValue } from '../types';
import { users } from '../data';

// Define a new shape for the component's state
interface GroupedReview {
  review: ReviewRequest;
  myAssignments: {
    stage: ReviewStage;
    assignment: ReviewAssignment;
  }[];
}

function MyReviews() {
  const [groupedReviews, setGroupedReviews] = useState<GroupedReview[]>([]);
  const [error, setError] = useState<string | null>(null);

  const currentUserId = users[0].id;

  const fetchData = async () => {
    try {
      const response = await fetch('/api/reviews');
      if (!response.ok) throw new Error('Network response was not ok');
      const allReviews: ReviewRequest[] = await response.json();

      // Group assignments by review request
      const groupedMap = allReviews.reduce((acc, review) => {
        const myAssignmentsInReview = [];
        for (const stage of review.stages) {
          const myAssignment = stage.assignments.find(a => a.reviewer.id === currentUserId);
          if (myAssignment) {
            myAssignmentsInReview.push({ stage, assignment: myAssignment });
          }
        }

        if (myAssignmentsInReview.length > 0) {
          acc.set(review.id, { review, myAssignments: myAssignmentsInReview });
        }
        return acc;
      }, new Map<string, GroupedReview>());

      setGroupedReviews(Array.from(groupedMap.values()));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStatusChange = async (reviewId: string, stageId: string, newStatus: ReviewStatusValue) => {
    try {
        const response = await fetch(`/api/reviews/${reviewId}/stages/${stageId}/assignments/${currentUserId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
        });
        if (!response.ok) throw new Error('Failed to update status');
        fetchData(); // Refetch data to update the UI
    } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  if (error) {
    return <div className="card" style={{ color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div>
      <h1>自分のレビュー</h1>
      <div>
        {groupedReviews.length > 0 ? groupedReviews.map(({ review, myAssignments }) => (
          <div key={review.id} className="card">
            <h2 style={{ marginBottom: '1rem' }}>
                <Link to={`/reviews/${review.id}`}>{review.title}</Link>
            </h2>
            {myAssignments.map(({ stage, assignment }) => (
              <div key={stage.id} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                        <p style={{ margin: 0 }}><strong>ステージ:</strong> {stage.name}</p>
                        <p style={{ margin: '0.5rem 0' }}>
                            <strong>URL:</strong> <a href={stage.repositoryUrl} target="_blank" rel="noopener noreferrer">{stage.repositoryUrl}</a>
                        </p>
                    </div>
                    <div>
                        <label><strong>自分のステータス:</strong></label>
                        <select
                            value={assignment.status}
                            onChange={(e) => handleStatusChange(review.id, stage.id, e.target.value as ReviewStatusValue)}
                            style={{ width: '100%' }}
                        >
                            <option value="pending">未着手</option>
                            <option value="reviewing">レビュー中</option>
                            <option value="commented">コメントあり</option>
                            <option value="approved">承認</option>
                        </select>
                    </div>
                </div>
              </div>
            ))}
          </div>
        )) : <p>担当するレビューはありません。</p>}
      </div>
    </div>
  );
}

export default MyReviews;
