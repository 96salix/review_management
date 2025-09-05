import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ReviewRequest, ReviewAssignment, ReviewStage, ReviewStatusValue } from '../types';

import StatusSelector from '../components/StatusSelector'; // Import StatusSelector

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

  const currentUserId = 'dummy-user-id'; // Temporarily hardcoded user ID

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

      let sortedReviews = Array.from(groupedMap.values());

      // Apply sorting logic here
      const statusOrder = {
        'pending': 1,
        'answered': 2,
        'commented': 3,
        'lgtm': 4,
      };

      sortedReviews.sort((a, b) => {
        const aWorstStatus = Math.min(...a.myAssignments.map(assign => statusOrder[assign.assignment.status]));
        const bWorstStatus = Math.min(...b.myAssignments.map(assign => statusOrder[assign.assignment.status]));

        if (aWorstStatus !== bWorstStatus) {
          return aWorstStatus - bWorstStatus;
        }

        return new Date(b.review.createdAt).getTime() - new Date(a.review.createdAt).getTime();
      });

      setGroupedReviews(sortedReviews);

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
        // Instead, update the state directly
        setGroupedReviews(prevGroupedReviews => {
            return prevGroupedReviews.map(group => {
                if (group.review.id === reviewId) {
                    return {
                        ...group,
                        myAssignments: group.myAssignments.map(assign => {
                            if (assign.stage.id === stageId && assign.assignment.reviewer.id === currentUserId) {
                                return {
                                    ...assign,
                                    assignment: { ...assign.assignment, status: newStatus }
                                };
                            }
                            return assign;
                        })
                    };
                }
                return group;
            });
        });
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
          <div key={review.id} className={`card ${myAssignments.every(a => a.assignment.status === 'lgtm') ? 'lgtm-card' : ''}`}>
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
                        <StatusSelector 
                            currentStatus={assignment.status} 
                            onStatusChange={(newStatus) => handleStatusChange(review.id, stage.id, newStatus)} 
                        />
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
