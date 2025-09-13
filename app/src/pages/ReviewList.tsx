import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ReviewRequest } from '../types';
import { addAuthHeader } from '../utils/api';

function ReviewList() {
  const [reviews, setReviews] = useState<ReviewRequest[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await fetch('/api/reviews', addAuthHeader());
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        setReviews(data);
      } catch (error) {
        if (error instanceof Error) {
            setError(error.message);
        } else {
            setError('An unknown error occurred');
        }
      }
    };

    fetchReviews();
  }, []);

  if (error) {
    return <div className="card" style={{ color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>レビュー依頼一覧</h1>
      </div>
      <div>
        {reviews.map((review) => (
          <div key={review.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                    <h2 style={{ marginBottom: '0.5rem' }}>
                        <Link to={`/reviews/${review.id}`}>{review.title}</Link>
                    </h2>
                    <p style={{ margin: 0, color: 'var(--secondary-color)' }}>
                        依頼者: <strong>{review.author.name}</strong> / 作成日: {new Date(review.createdAt).toLocaleDateString()}
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    {Array.from(new Map(review.stages.flatMap(s => s.assignments).map(a => [a.reviewer.id, a.reviewer])).values()).map(reviewer => (
                        <img
                            key={reviewer.id}
                            src={reviewer.avatarUrl}
                            alt={reviewer.name}
                            title={reviewer.name}
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                marginLeft: '-10px',
                                border: '2px solid white'
                            }}
                        />
                    ))}
                </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ReviewList;
