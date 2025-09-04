import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ReviewList from './pages/ReviewList';
import ReviewDetail from './pages/ReviewDetail';
import NewReview from './pages/NewReview';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ReviewList />} />
        <Route path="/reviews/:id" element={<ReviewDetail />} />
        <Route path="/new" element={<NewReview />} />
      </Routes>
    </Router>
  );
}

export default App;
