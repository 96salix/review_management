import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import ReviewList from './pages/ReviewList';
import MyReviews from './pages/MyReviews';
import UserManagement from './pages/UserManagement';
import StageTemplateManagement from './pages/StageTemplateManagement'; // Import StageTemplateManagement
import ReviewDetail from './pages/ReviewDetail';
import NewReview from './pages/NewReview';
import EditReview from './pages/EditReview'; // Import EditReview
import GlobalSettingsPage from './pages/GlobalSettings';

import { User } from './types'; // User型をインポート
import { addAuthHeader } from './utils/api';

const Header = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users', addAuthHeader());
        if (!response.ok) throw new Error('Failed to fetch users');
        const data: User[] = await response.json();
        setAllUsers(data);

        // ローカルストレージから現在のユーザーを読み込む
        const storedUserId = localStorage.getItem('currentUserId');
        if (storedUserId) {
          const user = data.find(u => u.id === storedUserId);
          if (user) {
            setCurrentUser(user);
          } else {
            // 存在しないユーザーIDの場合はクリア
            localStorage.removeItem('currentUserId');
          }
        } else if (data.length > 0) {
          // ローカルストレージにない場合は最初のユーザーを設定
          setCurrentUser(data[0]);
          localStorage.setItem('currentUserId', data[0].id);
        }
      } catch (err) {
        console.error('Error fetching users for Header:', err);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedUserId = e.target.value;
    const user = allUsers.find(u => u.id === selectedUserId);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('currentUserId', user.id);
    }
  };

  return (
    <header style={{
      backgroundColor: 'var(--surface-color)',
      padding: '0.5rem 1rem',
      borderBottom: '1px solid var(--border-color)',
      boxShadow: 'var(--shadow)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '1rem'
    }}>
      <Link to="/" style={{ textDecoration: 'none', color: 'var(--text-color)' }}>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>レビュー管理</h1>
      </Link>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <nav>
          <Link to="/" className="button" style={{ marginRight: '1rem' }}>レビュー一覧</Link>
          <Link to="/my-reviews" className="button" style={{ marginRight: '1rem' }}>自分のレビュー</Link>
          <Link to="/new" className="button">新規作成</Link>
        </nav>
        {/* Current User Selector */}
        <div style={{ marginLeft: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {currentUser && (
            <img src={currentUser.avatarUrl || 'https://i.pravatar.cc/150?u=' + currentUser.id} alt={currentUser.name} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
          )}
          <select onChange={handleUserChange} value={currentUser?.id || ''} style={{ padding: '0.5rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
            {allUsers.map(user => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>
        </div>
        <div style={{ position: 'relative', marginLeft: '1rem' }} ref={dropdownRef}>
          <button onClick={() => setDropdownOpen(!dropdownOpen)} className="button">⚙️</button>
          {dropdownOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              backgroundColor: 'var(--surface-color)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius)',
              boxShadow: 'var(--shadow)',
              padding: '0.5rem',
              marginTop: '0.5rem',
              zIndex: 1000,
              width: '160px'
            }}>
              <Link to="/users" className="button" style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: '0.5rem' }}>ユーザー管理</Link>
              <Link to="/stage-templates" className="button" style={{ display: 'block', width: '100%', textAlign: 'left' }}>テンプレート管理</Link>
              <Link to="/settings" className="button" style={{ display: 'block', width: '100%', textAlign: 'left', marginTop: '0.5rem' }}>グローバル設定</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

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
          <Route path="/users" element={<UserManagement />} />
          <Route path="/stage-templates" element={<StageTemplateManagement />} />
          <Route path="/reviews/:id" element={<ReviewDetail />} />
          <Route path="/reviews/:id/edit" element={<EditReview />} />
          <Route path="/new" element={<NewReview />} />
          <Route path="/settings" element={<GlobalSettingsPage />} />
        </Routes>
      </MainContent>
    </Router>
  );
}

export default App;
