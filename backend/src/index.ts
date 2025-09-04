
import express from 'express';
import cors from 'cors';
import { ReviewRequest, User, ReviewStatusValue } from './types';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// --- Data Store ---

const users: User[] = [
  { id: '1', name: 'Alice', avatarUrl: 'https://i.pravatar.cc/150?u=alice' },
  { id: '2', name: 'Bob', avatarUrl: 'https://i.pravatar.cc/150?u=bob' },
  { id: '3', name: 'Charlie', avatarUrl: 'https://i.pravatar.cc/150?u=charlie' },
];

let reviews: ReviewRequest[] = [
  {
    id: '1',
    title: 'Implement feature-x',
    author: users[0],
    createdAt: '2024-08-30T10:00:00Z',
    stages: [
      {
        id: '1-1',
        name: '1st Round',
        repositoryUrl: 'https://github.com/example/project/pull/123',
        assignments: [
          { reviewer: users[1], status: 'approved' },
          { reviewer: users[2], status: 'commented' },
        ],
        comments: [
            {
                id: '1',
                author: users[2],
                content: 'This looks good, but please add a unit test.',
                createdAt: '2024-08-30T14:20:00Z',
                lineNumber: 25
            }
        ],
      },
      {
        id: '1-2',
        name: 'Security Check',
        repositoryUrl: 'https://github.com/example/project/pull/123',
        assignments: [
          { reviewer: users[0], status: 'pending' },
        ],
        comments: [],
      }
    ],
  },
];

// --- Auth Simulation ---
app.use((req, res, next) => {
  // @ts-ignore
  req.currentUser = users[0];
  next();
});


// --- API Endpoints ---

// GET /api/reviews
app.get('/api/reviews', (req, res) => {
  res.json(reviews);
});

// GET /api/reviews/:id
app.get('/api/reviews/:id', (req, res) => {
  const review = reviews.find(r => r.id === req.params.id);
  if (review) {
    res.json(review);
  } else {
    res.status(404).send('Review not found');
  }
});

// POST /api/reviews
app.post('/api/reviews', (req, res) => {
    // @ts-ignore
    const currentUser = req.currentUser as User;
    const newReview: ReviewRequest = {
        id: String(reviews.length + 1),
        createdAt: new Date().toISOString(),
        author: currentUser,
        ...req.body,
    };
    reviews.push(newReview);
    res.status(201).json(newReview);
});

// PUT /api/reviews/:reviewId/stages/:stageId/assignments/:reviewerId
app.put('/api/reviews/:reviewId/stages/:stageId/assignments/:reviewerId', (req, res) => {
    const { reviewId, stageId, reviewerId } = req.params;
    const { status } = req.body as { status: ReviewStatusValue };

    const review = reviews.find(r => r.id === reviewId);
    if (!review) {
        return res.status(404).send('Review not found');
    }

    const stage = review.stages.find(s => s.id === stageId);
    if (!stage) {
        return res.status(404).send('Stage not found');
    }

    const assignment = stage.assignments.find(a => a.reviewer.id === reviewerId);
    if (!assignment) {
        return res.status(404).send('Assignment not found');
    }

    assignment.status = status;
    res.json(review);
});

// POST /api/reviews/:reviewId/stages/:stageId/comments
app.post('/api/reviews/:reviewId/stages/:stageId/comments', (req, res) => {
    // @ts-ignore
    const currentUser = req.currentUser as User;
    const { reviewId, stageId } = req.params;
    const { content, lineNumber } = req.body;

    const review = reviews.find(r => r.id === reviewId);
    if (!review) {
        return res.status(404).send('Review not found');
    }

    const stage = review.stages.find(s => s.id === stageId);
    if (!stage) {
        return res.status(404).send('Stage not found');
    }

    const newComment = {
        id: String(stage.comments.length + 1),
        author: currentUser,
        content,
        lineNumber,
        createdAt: new Date().toISOString(),
    };
    stage.comments.push(newComment);
    res.json(review);
});


app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});
