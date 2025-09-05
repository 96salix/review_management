
import express from 'express';
import cors from 'cors';
import { ReviewRequest, User, ReviewStatus, ReviewStatusValue, StageTemplate, ActivityLog } from './types';

const app = express();
const port = 3001;

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
    activityLogs: [],
  },
];

let stageTemplates: StageTemplate[] = [];

// Helper to generate unique IDs for logs
let logIdCounter = 1000;
const generateLogId = () => `log-${logIdCounter++}`;

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
        title: req.body.title,
        author: currentUser,
        createdAt: new Date().toISOString(),
        stages: req.body.stages,
        activityLogs: [], // Initialize activity logs
    };

    // Add CREATE log
    newReview.activityLogs.push({
        id: generateLogId(),
        type: 'CREATE',
        user: currentUser,
        details: `レビュー依頼「${newReview.title}」を作成しました。`,
        createdAt: newReview.createdAt,
    });

    reviews.push(newReview);
    res.status(201).json(newReview);
});

// PUT /api/reviews/:reviewId/stages/:stageId/assignments/:reviewerId
app.put('/api/reviews/:reviewId/stages/:stageId/assignments/:reviewerId', (req, res) => {
    // @ts-ignore
    const currentUser = req.currentUser as User;
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

    const oldStatus = assignment.status;
    assignment.status = status;

    // Add STATUS_CHANGE log
    review.activityLogs.push({
        id: generateLogId(),
        type: 'STATUS_CHANGE',
        user: currentUser,
        details: `${assignment.reviewer.name} のステータスが「${oldStatus}」から「${status}」に変更されました (ステージ: ${stage.name})。`,
        createdAt: new Date().toISOString(),
    });
    // Sort logs by createdAt descending
    review.activityLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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

    // Add COMMENT log
    review.activityLogs.push({
        id: generateLogId(),
        type: 'COMMENT',
        user: currentUser,
        details: `コメントを追加しました (ステージ: ${stage.name})：「${content.substring(0, 50)}...」`,
        createdAt: newComment.createdAt,
    });
    // Sort logs by createdAt descending
    review.activityLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(review);
});

// --- User Management API Endpoints ---
app.get('/api/users', (req, res) => {
  res.json(users);
});

app.post('/api/users', (req, res) => {
  const newUser: User = {
    id: String(users.length + 1),
    name: req.body.name,
    avatarUrl: req.body.avatarUrl || 'https://i.pravatar.cc/150?img=' + (users.length + 1),
  };
  users.push(newUser);
  res.status(201).json(newUser);
});

app.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const userIndex = users.findIndex(u => u.id === id);
  if (userIndex === -1) {
    return res.status(404).send('User not found');
  }
  const updatedUser = { ...users[userIndex], ...req.body };
  users[userIndex] = updatedUser;
  res.json(updatedUser);
});

app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const userIndex = users.findIndex(u => u.id === id);
  if (userIndex === -1) {
    return res.status(404).send('User not found');
  }
  users.splice(userIndex, 1);
  res.status(204).send();
});

// --- Stage Template API Endpoints ---
app.get('/api/stage-templates', (req, res) => {
  res.json(stageTemplates);
});

app.post('/api/stage-templates', (req, res) => {
  const newTemplate: StageTemplate = {
    id: 'template-' + (stageTemplates.length + 1),
    name: req.body.name,
    stages: req.body.stages,
  };
  stageTemplates.push(newTemplate);
  res.status(201).json(newTemplate);
});

app.put('/api/stage-templates/:id', (req, res) => {
  const { id } = req.params;
  const templateIndex = stageTemplates.findIndex(t => t.id === id);
  if (templateIndex === -1) {
    return res.status(404).send('Template not found');
  }
  const updatedTemplate = { ...stageTemplates[templateIndex], ...req.body };
  stageTemplates[templateIndex] = updatedTemplate;
  res.json(updatedTemplate);
});

app.delete('/api/stage-templates/:id', (req, res) => {
  const { id } = req.params;
  const templateIndex = stageTemplates.findIndex(t => t.id === id);
  if (templateIndex === -1) {
    return res.status(404).send('Template not found');
  }
  stageTemplates.splice(templateIndex, 1);
  res.status(204).send();
});


app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});
