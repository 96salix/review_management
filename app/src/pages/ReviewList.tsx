import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ReviewRequest } from '../types';
import { addAuthHeader } from '../utils/api';

const LIMIT = 10;

function ReviewList() {
  const [reviews, setReviews] = useState<ReviewRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await fetch(`/api/reviews?sortBy=${sortBy}&order=${order}&page=${currentPage}&limit=${LIMIT}`, addAuthHeader());
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

    fetchReviews();
  }, [sortBy, order, currentPage]);

  const totalPages = Math.ceil(totalCount / LIMIT);

  if (error) {
    return <div className="card" style={{ color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>レビュー依頼一覧</h1>
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
        {reviews.map((review) => {
          const nearestDueDate = review.stages
            .map(s => s.dueDate)
            .filter(Boolean)
            .map(d => new Date(d!))
            .sort((a, b) => a.getTime() - b.getTime())[0];

          return (
            <div key={review.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                      <h2 style={{ marginBottom: '0.5rem' }}>
                          <Link to={`/reviews/${review.id}`}>{review.title}</Link>
                      </h2>
                      <p style={{ margin: 0, color: 'var(--secondary-color)' }}>
                          依頼者: <strong>{review.author.name}</strong> / 作成日: {new Date(review.createdAt).toLocaleDateString()}
                          {nearestDueDate && ` / 期日: ${new Date(nearestDueDate).toLocaleDateString()}`}
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
          );
        })}
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

export default ReviewList;
