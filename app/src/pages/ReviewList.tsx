import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ReviewRequest } from '../types';

function ReviewList() {
  const [reviews, setReviews] = useState<ReviewRequest[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await fetch('/api/reviews');
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>Review Requests</h1>
        {/* This button is now in the header, so we can remove it from here */}
        {/* <Link to="/new" className="button">New Review Request</Link> */}
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
                        by <strong>{review.author.name}</strong> on {new Date(review.createdAt).toLocaleDateString()}
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    {review.stages.flatMap(s => s.assignments).map(a => (
                        <img
                            key={a.reviewer.id}
                            src={a.reviewer.avatarUrl}
                            alt={a.reviewer.name}
                            title={`${a.reviewer.name} (${a.status})`}
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
