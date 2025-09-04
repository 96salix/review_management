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
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h1>Review Requests</h1>
      <Link to="/new">
        <button>New Review Request</button>
      </Link>
      <div style={{ marginTop: '1rem' }}>
        {reviews.map((review) => (
          <div key={review.id} style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem' }}>
            <h2>
              <Link to={`/reviews/${review.id}`}>{review.title}</Link>
            </h2>
            <p>Author: {review.author.name}</p>
            <p>Created at: {new Date(review.createdAt).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ReviewList;
