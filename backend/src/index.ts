
import express from 'express';
import cors from 'cors';
import { ReviewRequest, User, ReviewStatus, ReviewStatusValue, StageTemplate, ActivityLog } from './types';
import { v4 as uuidv4 } from 'uuid';
import { Client } from 'pg';

const app = express();
const port = 3001;

// Database connection setup
const dbConfig = {
  user: process.env.POSTGRES_USER || 'user',
  host: process.env.POSTGRES_HOST || 'db',
  database: process.env.POSTGRES_DB || 'review_management',
  password: process.env.POSTGRES_PASSWORD || 'password',
  port: 5432,
};

const client = new Client(dbConfig);

async function connectDb() {
  try {
    await client.connect();
    console.log('Connected to PostgreSQL database');
  } catch (err) {
    console.error('Database connection error', err);
    process.exit(1); // Exit if DB connection fails
  }
}

connectDb();

app.use(cors());
app.use(express.json());

// --- Data Store ---



let reviews: ReviewRequest[] = [];

let stageTemplates: StageTemplate[] = [];

// Helper to generate unique IDs for logs
let logIdCounter = 1000;
const generateLogId = () => `log-${logIdCounter++}`;

// --- Auth Simulation ---
app.use((req, res, next) => {
  // @ts-ignore
  req.currentUser = { id: 'dummy-user-id', name: 'Dummy User', avatarUrl: 'https://i.pravatar.cc/150?u=dummy' };
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
app.get('/api/users', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching users', err);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/api/users', async (req, res) => {
  const { name, avatarUrl } = req.body;
  const newId = uuidv4(); // UUIDを生成
  const defaultAvatarUrl = `https://i.pravatar.cc/150?u=${newId}`;
  const userAvatarUrl = avatarUrl || defaultAvatarUrl;

  try {
    const result = await client.query(
      'INSERT INTO users (id, name, avatar_url) VALUES ($1, $2, $3) RETURNING *',
      [newId, name, userAvatarUrl]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating user', err);
    res.status(500).send('Internal Server Error');
  }
});

app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const { name, avatarUrl } = req.body;

  try {
    const result = await client.query(
      'UPDATE users SET name = COALESCE($1, name), avatar_url = COALESCE($2, avatar_url) WHERE id = $3 RETURNING *',
      [name, avatarUrl, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).send('User not found');
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating user', err);
    res.status(500).send('Internal Server Error');
  }
});

app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await client.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).send('User not found');
    }
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting user', err);
    res.status(500).send('Internal Server Error');
  }
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
