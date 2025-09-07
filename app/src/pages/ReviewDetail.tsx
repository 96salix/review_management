import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ReviewRequest, ReviewStatusValue, ReviewStage, GlobalSettings } from '../types';
import StatusSelector from '../components/StatusSelector'; // Import StatusSelector
import { addAuthHeader } from '../utils/api';

interface CommentItemProps {
  comment: Comment;
  onReply: (parentCommentId: string, content: string) => void;
}

const CommentItem: React.FC<CommentItemProps> = ({ comment, onReply }) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    await onReply(comment.id, replyContent); // 親コメントIDと内容を渡す
    setReplyContent('');
    setShowReplyForm(false);
  };

  return (
    <div style={{ display: 'flex', marginBottom: '0.5rem', marginLeft: comment.parentCommentId ? '2rem' : '0' }}>
      <img src={comment.author.avatarUrl} alt={comment.author.name} style={{ width: '28px', height: '28px', borderRadius: '50%', marginRight: '0.5rem' }} />
      <div style={{ flex: 1, background: '#f1f1f1', padding: '0.5rem', borderRadius: 'var(--border-radius)' }}>
        <p style={{ margin: 0, fontWeight: '600' }}>
          {comment.author.name}
          <span style={{ color: 'var(--secondary-color)', fontWeight: 'normal', marginLeft: '0.5rem' }}>
            コメント日時: {new Date(comment.createdAt).toLocaleString()}
          </span>
        </p>
        {comment.lineNumber && <p style={{ margin: '0.5rem 0 0', color: 'var(--secondary-color)' }}>Line: {comment.lineNumber}</p>}
        <p style={{ margin: '0.5rem 0 0' }}>{comment.content}</p>
        <button onClick={() => setShowReplyForm(!showReplyForm)} style={{ fontSize: '0.8em', padding: '0.2rem 0.5rem', marginTop: '0.5rem' }}>
          {showReplyForm ? '返信をキャンセル' : '返信する'}
        </button>

        {showReplyForm && (
          <form onSubmit={handleReplySubmit} style={{ display: 'flex', flexDirection: 'column', marginTop: '0.5rem' }}>
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="返信コメントを入力..."
              rows={2}
              style={{ marginBottom: '0.5rem' }}
            />
            <button type="submit" style={{ alignSelf: 'flex-end' }}>返信を投稿</button>
          </form>
        )}

        {comment.replies && comment.replies.length > 0 && (
          <div style={{ marginTop: '0.5rem' }}>
            <CommentList comments={comment.replies} onReply={onReply} />
          </div>
        )}
      </div>
    </div>
  );
};

interface CommentListProps {
  comments: Comment[];
  onReply: (parentCommentId: string, content: string) => void;
}

const CommentList: React.FC<CommentListProps> = ({ comments, onReply }) => {
  return (
    <>
      {comments.map(comment => (
        <CommentItem key={comment.id} comment={comment} onReply={onReply} />
      ))}
    </>
  );
};

function ReviewDetail() {
  const { id } = useParams<{ id: string }>();
  const [review, setReview] = useState<ReviewRequest | null>(null);
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [copySuccessMessage, setCopySuccessMessage] = useState('');
  const [settings, setSettings] = useState<GlobalSettings | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings', addAuthHeader());
        if (!response.ok) {
          throw new Error('Failed to fetch settings');
        }
        const data = await response.json();
        setSettings(data);
      } catch (err) {
        // Silently fail or show a less intrusive error
        console.error(err);
      }
    };

    fetchSettings();
  }, []);

  const fetchReview = async () => {
    try {
      const response = await fetch(`/api/reviews/${id}`, addAuthHeader());
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
        const response = await fetch(`/api/reviews/${review.id}/stages/${activeStage.id}/assignments/${reviewerId}`, addAuthHeader({
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
        }));
        if (!response.ok) throw new Error('Failed to update status');
        const updatedReview = await response.json();
        setReview(updatedReview);
    } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  const handleCommentSubmit = async (content: string, parentCommentId: string | null = null) => {
    if (!review || !activeStage || !content.trim()) return;
    try {
        const response = await fetch(`/api/reviews/${review.id}/stages/${activeStage.id}/comments`, addAuthHeader({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: content, parentCommentId: parentCommentId }), // parentCommentId を追加
        }));
        if (!response.ok) throw new Error('Failed to post comment');
        const updatedReview = await response.json();
        setReview(updatedReview);
        setNewComment('');
    } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  const handleCopyToClipboard = async (stage: ReviewStage) => {
    if (!review) return;

    const reviewers = stage.assignments.map(a => `@${a.reviewer.name}`).join(' ');
    const reviewUrl = settings?.serviceDomain ? `${settings.serviceDomain}/reviews/${review.id}` : window.location.href;
    const textToCopy = `
レビューをお願いします！

■レビュー対象
${review.url}

■レビュアー
${reviewers}

■レビュー詳細
${reviewUrl}
    `;

    try {
      await navigator.clipboard.writeText(textToCopy.trim());
      setCopySuccessMessage('クリップボードにコピーしました！');
      setTimeout(() => setCopySuccessMessage(''), 3000);
    } catch (err) {
      console.error('クリップボードへのコピーに失敗しました', err);
      setCopySuccessMessage('コピーに失敗しました。');
      setTimeout(() => setCopySuccessMessage(''), 3000);
    }
  };

  // CommentListに渡すonReplyハンドラ
  const handleReply = async (parentCommentId: string, content: string) => {
    await handleCommentSubmit(content, parentCommentId);
  };

  if (error) return <div className="card" style={{ color: 'red' }}>Error: {error}</div>;
  if (!review) return <div>Loading...</div>;

  const activeStage = review.stages.find(s => s.id === activeStageId);

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div>
            <h1 style={{ marginBottom: '0.25rem' }}>{review.title}</h1>
            <p style={{ margin: 0, color: 'var(--secondary-color)' }}>
                依頼者: <strong>{review.author.name}</strong> / 作成日時: {new Date(review.createdAt).toLocaleString()}
            </p>
        </div>
        <Link to={`/reviews/${review.id}/edit`} className="button">編集</Link>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '0.75rem' }}>
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
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3>レビュアー</h3>
              <button onClick={() => handleCopyToClipboard(activeStage)} style={{ padding: '0.3rem 0.8rem' }}>Slack投稿をコピー</button>
            </div>
            {copySuccessMessage && <div style={{ color: 'green', marginBottom: '0.5rem' }}>{copySuccessMessage}</div>}
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {activeStage.assignments.map(assignment => (
                <li key={assignment.reviewer.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <img src={assignment.reviewer.avatarUrl} alt={assignment.reviewer.name} style={{ width: '28px', height: '28px', borderRadius: '50%', marginRight: '0.5rem' }} />
                  <span style={{ flex: 1 }}>{assignment.reviewer.name}</span>
                  <StatusSelector 
                    currentStatus={assignment.status} 
                    onStatusChange={(newStatus) => handleStatusChange(assignment.reviewer.id, newStatus)} 
                  />
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3>コメント</h3>
            <div style={{ marginBottom: '0.75rem' }}>
              {activeStage.comments.length > 0 ? (
                <CommentList comments={activeStage.comments} onReply={handleReply} />
              ) : (
                <p>まだコメントはありません。</p>
              )}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleCommentSubmit(newComment); }} style={{ display: 'flex', flexDirection: 'column' }}>
                <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="コメントを追加..."
                    rows={3}
                />
                <button type="submit" style={{ marginTop: '0.5rem', alignSelf: 'flex-end' }}>投稿</button>
            </form>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <h3>アクティビティ</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {review.activityLogs.map(log => (
                <li key={log.id} style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'flex-start' }}>
                  <img src={log.user.avatarUrl} alt={log.user.name} style={{ width: '24px', height: '24px', borderRadius: '50%', marginRight: '0.5rem' }} />
                  <div>
                    <span style={{ fontWeight: '600' }}>{log.user.name}</span>
                    <span style={{ color: 'var(--secondary-color)', marginLeft: '0.5rem', fontSize: '0.85em' }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                    <p style={{ margin: '0.2rem 0 0' }}>{log.details}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

        </div>
      )}
    </div>
  );
}

export default ReviewDetail;