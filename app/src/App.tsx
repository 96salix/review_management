import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import ReviewList from './pages/ReviewList';
import MyReviews from './pages/MyReviews';
import ReviewDetail from './pages/ReviewDetail';
import NewReview from './pages/NewReview';
import EditReview from './pages/EditReview'; // Import EditReview

const Header = () => (
  <header style={{
    backgroundColor: 'var(--surface-color)',
    padding: '1rem 2rem',
    borderBottom: '1px solid var(--border-color)',
    boxShadow: 'var(--shadow)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem'
  }}>
    <Link to="/" style={{ textDecoration: 'none', color: 'var(--text-color)' }}>
      <h1 style={{ fontSize: '1.5rem', margin: 0 }}>レビュー管理</h1>
    </Link>
    <nav>
      <Link to="/" className="button" style={{ marginRight: '1rem' }}>レビュー一覧</Link>
      <Link to="/my-reviews" className="button" style={{ marginRight: '1rem' }}>自分のレビュー</Link>
      <Link to="/new" className="button">新規作成</Link>
    </nav>
  </header>
);

const MainContent = ({ children }: { children: React.ReactNode }) => (
    <main style={{
        padding: '0 2rem',
        maxWidth: '1200px',
        margin: '0 auto'
    }}>
        {children}
    </main>
);


function App() {
  return (
    <Router>
      <Header />
      <MainContent>
        <Routes>
          <Route path="/" element={<ReviewList />} />
          <Route path="/my-reviews" element={<MyReviews />} />
          <Route path="/reviews/:id" element={<ReviewDetail />} />
          <Route path="/reviews/:id/edit" element={<EditReview />} />
          <Route path="/new" element={<NewReview />} />
        </Routes>
      </MainContent>
    </Router>
  );
}

export default App;
