
import express from 'express';
import cors from 'cors';
import { ReviewRequest, User, ReviewStatus, ReviewStatusValue, StageTemplate, ActivityLog, ReviewStage, ReviewAssignment, Comment, TemplateStage } from './types';
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

const MAX_RETRIES = 5;
const RETRY_DELAY = 5000; // 5 seconds

async function connectDb(retries = MAX_RETRIES) {
  try {
    await client.connect();
    console.log('Connected to PostgreSQL database');
  } catch (err) {
    console.error('Database connection error', err);
    if (retries > 0) {
      console.log(`Retrying connection in ${RETRY_DELAY / 1000} seconds... (${retries} retries left)`);
      await new Promise(res => setTimeout(res, RETRY_DELAY));
      await connectDb(retries - 1);
    } else {
      console.error('Could not connect to the database. Exiting.');
      process.exit(1); // Exit if DB connection fails after all retries
    }
  }
}

connectDb();

app.use(cors());
app.use(express.json());

async function fetchReviewDetails(reviewId: string): Promise<ReviewRequest | null> {
  const reviewResult = await client.query('SELECT * FROM review_requests WHERE id = $1', [reviewId]);
  if (reviewResult.rows.length === 0) {
    return null;
  }
  const reviewRow = reviewResult.rows[0];

  const authorResult = await client.query('SELECT id, name, avatar_url FROM users WHERE id = $1', [reviewRow.author_id]);
  const author = authorResult.rows[0] || { id: reviewRow.author_id, name: 'Unknown User', avatarUrl: '' };

  const stagesResult = await client.query('SELECT * FROM review_stages WHERE review_request_id = $1 ORDER BY name', [reviewId]);
  const stages: ReviewStage[] = await Promise.all(stagesResult.rows.map(async stageRow => {
    const assignmentsResult = await client.query(`
      SELECT ra.*, u.name AS reviewer_name, u.avatar_url AS reviewer_avatar_url
      FROM review_assignments ra
      JOIN users u ON ra.reviewer_id = u.id
      WHERE ra.review_stage_id = $1
      ORDER BY u.name
    `, [stageRow.id]);
    const assignments: ReviewAssignment[] = assignmentsResult.rows.map(assignmentRow => {
      const reviewer: User = {
        id: assignmentRow.reviewer_id,
        name: assignmentRow.reviewer_name,
        avatarUrl: assignmentRow.reviewer_avatar_url || `https://i.pravatar.cc/150?u=${assignmentRow.reviewer_id}`,
      };
      return {
        reviewer: reviewer,
        status: assignmentRow.status,
      };
    });

    const commentsResult = await client.query('SELECT * FROM comments WHERE review_stage_id = $1 ORDER BY created_at', [stageRow.id]);
    const allComments: Comment[] = await Promise.all(commentsResult.rows.map(async commentRow => {
      const commentAuthorResult = await client.query('SELECT id, name, avatar_url FROM users WHERE id = $1', [commentRow.author_id]);
      const commentAuthor: User = commentAuthorResult.rows[0] || { id: commentRow.author_id, name: 'Unknown User', avatarUrl: '' };
      return {
        id: commentRow.id,
        author: commentAuthor,
        content: commentRow.content,
        createdAt: commentRow.created_at,
        lineNumber: commentRow.line_number,
        parentCommentId: commentRow.parent_comment_id, // parentCommentId を追加
      };
    }));

    // コメントをスレッド形式に整形
    const commentsMap = new Map<string, Comment>();
    allComments.forEach(comment => commentsMap.set(comment.id, { ...comment, replies: [] }));

    const comments: Comment[] = [];
    allComments.forEach(comment => {
      if (comment.parentCommentId && commentsMap.has(comment.parentCommentId)) {
        commentsMap.get(comment.parentCommentId)?.replies?.push(comment);
      } else {
        comments.push(commentsMap.get(comment.id)!);
      }
    });
    // トップレベルのコメントを日付でソート
    comments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return {
      id: stageRow.id,
      name: stageRow.name,
      repositoryUrl: stageRow.repository_url,
      reviewerCount: stageRow.reviewer_count,
      assignments: assignments,
      comments: comments,
    };
  }));

  const activityLogsResult = await client.query('SELECT * FROM activity_logs WHERE review_request_id = $1 ORDER BY created_at DESC', [reviewId]);
  const activityLogs: ActivityLog[] = await Promise.all(activityLogsResult.rows.map(async logRow => {
    const logUserResult = await client.query('SELECT id, name, avatar_url FROM users WHERE id = $1', [logRow.user_id]);
    const logUser = logUserResult.rows[0] || { id: logRow.user_id, name: 'Unknown User', avatarUrl: '' };
    return {
      id: logRow.id,
      type: logRow.type,
      user: logUser,
      details: logRow.details,
      createdAt: logRow.created_at,
    };
  }));

  return {
    id: reviewRow.id,
    title: reviewRow.title,
    url: reviewRow.url,
    author: author,
    createdAt: reviewRow.created_at,
    stages: stages,
    activityLogs: activityLogs,
  };
}

// --- Data Store ---



let reviews: ReviewRequest[] = [];


async function fetchStageTemplateDetails(templateId: string): Promise<StageTemplate | null> {
  const templateResult = await client.query('SELECT * FROM stage_templates WHERE id = $1', [templateId]);
  if (templateResult.rows.length === 0) {
    return null;
  }
  const templateRow = templateResult.rows[0];

  const stagesResult = await client.query('SELECT * FROM template_stages WHERE stage_template_id = $1 ORDER BY name', [templateId]);
  const stages: TemplateStage[] = stagesResult.rows.map(stageRow => ({
    name: stageRow.name,
    reviewerIds: stageRow.reviewer_ids,
    reviewerCount: stageRow.reviewer_count,
  }));

  return {
    id: templateRow.id,
    name: templateRow.name,
    stages: stages,
    isDefault: templateRow.is_default,
  };
}

let stageTemplates: StageTemplate[] = [];



// --- Auth Simulation ---
app.use(async (req, res, next) => {
  const userId = req.headers['x-user-id'] as string; // フロントエンドから送られるカスタムヘッダー
  if (userId) {
    try {
      const result = await client.query('SELECT id, name, avatar_url FROM users WHERE id = $1', [userId]);
      if (result.rows.length > 0) {
        // @ts-ignore
        req.currentUser = result.rows[0];
      } else {
        // @ts-ignore
        req.currentUser = null; // ユーザーが見つからない場合
      }
    } catch (err) {
      console.error('Error fetching current user:', err);
      // @ts-ignore
      req.currentUser = null;
    }
  } else {
    // @ts-ignore
    req.currentUser = null; // ヘッダーがない場合
  }
  next();
});


// --- API Endpoints ---

// GET /api/reviews
app.get('/api/reviews', async (req, res) => {
  try {
    const result = await client.query('SELECT id FROM review_requests'); // Only fetch IDs
    const reviewsData = await Promise.all(result.rows.map(async row => {
      const review = await fetchReviewDetails(row.id);
      return review;
    }));
    res.json(reviewsData.filter(Boolean)); // Filter out nulls if any
  } catch (err) {
    console.error('Error fetching reviews', err);
    res.status(500).send('Internal Server Error');
  }
});

// GET /api/reviews/:id
app.get('/api/reviews/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const review = await fetchReviewDetails(id);
    if (!review) {
      return res.status(404).send('Review not found');
    }
    res.json(review);
  } catch (err) {
    console.error('Error fetching review by ID', err);
    res.status(500).send('Internal Server Error');
  }
});

// POST /api/reviews
app.post('/api/reviews', async (req, res) => {
    // @ts-ignore
    const currentUser = req.currentUser as User;
    const { title, url, stages } = req.body;
    const newReviewId = uuidv4();
    const createdAt = new Date().toISOString();

    try {
        // Insert into review_requests table
        await client.query(
            'INSERT INTO review_requests (id, title, url, author_id, created_at) VALUES ($1, $2, $3, $4, $5)',
            [newReviewId, title, url, currentUser.id, createdAt]
        );

        // Insert stages and their assignments/comments (simplified for now)
        for (const stage of stages) {
            const newStageId = uuidv4();
            await client.query(
                'INSERT INTO review_stages (id, review_request_id, name, repository_url, reviewer_count) VALUES ($1, $2, $3, $4, $5)',
                [newStageId, newReviewId, stage.name, stage.repositoryUrl, stage.reviewerCount]
            );

            for (const assignment of stage.assignments) {
                await client.query(
                    'INSERT INTO review_assignments (id, review_stage_id, reviewer_id, status) VALUES ($1, $2, $3, $4)',
                    [uuidv4(), newStageId, assignment.reviewer.id, assignment.status]
                );
            }
            // Comments are not handled in initial POST, will be added via separate endpoint
        }

        // Add CREATE activity log
        await client.query(
            'INSERT INTO activity_logs (id, review_request_id, type, user_id, details, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
            [uuidv4(), newReviewId, 'CREATE', currentUser.id, `レビュー依頼「${title}」を作成しました。`, createdAt]
        );

        // Fetch the newly created review to return it (simplified for now)
        const result = await client.query('SELECT * FROM review_requests WHERE id = $1', [newReviewId]);
        const newReview = result.rows[0];

        res.status(201).json({
            id: newReview.id,
            title: newReview.title,
            url: newReview.url,
            author: currentUser, // Assuming currentUser is the author
            createdAt: newReview.created_at,
            stages: [], // Stages will be fetched later
            activityLogs: [], // Activity logs will be fetched later
        });

    } catch (err) {
        console.error('Error creating review', err);
        res.status(500).send('Internal Server Error');
    }
});

// PUT /api/reviews/:id
app.put('/api/reviews/:id', async (req, res) => {
    const { id } = req.params;
    const { title, url, stages } = req.body;

    try {
        // Update review_requests table
        const updateReviewResult = await client.query(
            'UPDATE review_requests SET title = $1, url = $2 WHERE id = $3 RETURNING *',
            [title, url, id]
        );

        if (updateReviewResult.rows.length === 0) {
            return res.status(404).send('Review not found');
        }

        // Delete existing stages and assignments
        await client.query('DELETE FROM review_assignments WHERE review_stage_id IN (SELECT id FROM review_stages WHERE review_request_id = $1)', [id]);
        await client.query('DELETE FROM comments WHERE review_stage_id IN (SELECT id FROM review_stages WHERE review_request_id = $1)', [id]);
        await client.query('DELETE FROM review_stages WHERE review_request_id = $1', [id]);

        // Insert new stages and their assignments
        for (const stage of stages) {
            const newStageId = uuidv4();
            await client.query(
                'INSERT INTO review_stages (id, review_request_id, name, repository_url, reviewer_count) VALUES ($1, $2, $3, $4, $5)',
                [newStageId, id, stage.name, stage.repositoryUrl, stage.reviewerCount]
            );

            for (const assignment of stage.assignments) {
                await client.query(
                    'INSERT INTO review_assignments (id, review_stage_id, reviewer_id, status) VALUES ($1, $2, $3, $4)',
                    [uuidv4(), newStageId, assignment.reviewer.id, assignment.status]
                );
            }
        }

        const updatedReview = await fetchReviewDetails(id);
        res.json(updatedReview);

    } catch (err) {
        console.error('Error updating review', err);
        res.status(500).send('Internal Server Error');
    }
});

// PUT /api/reviews/:reviewId/stages/:stageId/assignments/:reviewerId
app.put('/api/reviews/:reviewId/stages/:stageId/assignments/:reviewerId', async (req, res) => {
    // @ts-ignore
    const currentUser = req.currentUser as User;
    const { reviewId, stageId, reviewerId } = req.params;
    const { status } = req.body as { status: ReviewStatusValue };
    const createdAt = new Date().toISOString();

    try {
        // Find the assignment to get old status and reviewer name
        const assignmentResult = await client.query(
            `SELECT ra.status, u.name AS reviewer_name, rs.name AS stage_name
             FROM review_assignments ra
             JOIN users u ON ra.reviewer_id = u.id
             JOIN review_stages rs ON ra.review_stage_id = rs.id
             WHERE ra.review_stage_id = $1 AND ra.reviewer_id = $2`,
            [stageId, reviewerId]
        );

        if (assignmentResult.rows.length === 0) {
            return res.status(404).send('Assignment not found');
        }
        const oldStatus = assignmentResult.rows[0].status;
        const reviewerName = assignmentResult.rows[0].reviewer_name;
        const stageName = assignmentResult.rows[0].stage_name;

        // Update assignment status
        const updateResult = await client.query(
            'UPDATE review_assignments SET status = $1 WHERE review_stage_id = $2 AND reviewer_id = $3 RETURNING *',
            [status, stageId, reviewerId]
        );

        if (updateResult.rows.length === 0) {
            return res.status(404).send('Assignment not found after update');
        }

        // Add STATUS_CHANGE activity log
        await client.query(
            'INSERT INTO activity_logs (id, review_request_id, type, user_id, details, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
            [uuidv4(), reviewId, 'STATUS_CHANGE', currentUser.id, `${reviewerName} のステータスが「${oldStatus}」から「${status}」に変更されました (ステージ: ${stageName})。`, createdAt]
        );

        // Fetch the updated review to return it (simplified for now)
        const reviewResult = await client.query('SELECT * FROM review_requests WHERE id = $1', [reviewId]);
        if (reviewResult.rows.length === 0) {
            return res.status(404).send('Review not found after update');
        }
        const updatedReview = reviewResult.rows[0];

        const fullUpdatedReview = await fetchReviewDetails(reviewId);
        if (!fullUpdatedReview) {
            return res.status(404).send('Review not found after update');
        }
        res.json(fullUpdatedReview);

    } catch (err) {
        console.error('Error updating assignment status', err);
        res.status(500).send('Internal Server Error');
    }
});

// POST /api/reviews/:reviewId/stages/:stageId/comments
app.post('/api/reviews/:reviewId/stages/:stageId/comments', async (req, res) => {
    // @ts-ignore
    const currentUser = req.currentUser as User;
    const { reviewId, stageId } = req.params;
    const { content, lineNumber, parentCommentId } = req.body; // parentCommentId を追加
    const createdAt = new Date().toISOString();

    try {
        // Insert into comments table
        const commentResult = await client.query(
            'INSERT INTO comments (id, review_stage_id, author_id, content, created_at, line_number, parent_comment_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *'
            [uuidv4(), stageId, currentUser.id, content, createdAt, lineNumber, parentCommentId] // parentCommentId を追加
        );
        const newComment = commentResult.rows[0];

        // Add COMMENT activity log
        const stageResult = await client.query('SELECT name FROM review_stages WHERE id = $1', [stageId]);
        const stageName = stageResult.rows.length > 0 ? stageResult.rows[0].name : 'Unknown Stage';

        await client.query(
            'INSERT INTO activity_logs (id, review_request_id, type, user_id, details, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
            [uuidv4(), reviewId, 'COMMENT', currentUser.id, `コメントを追加しました (ステージ: ${stageName})：「${content.substring(0, 50)}...」`, createdAt]
        );

        // Fetch the updated review to return it (simplified for now)
        const reviewResult = await client.query('SELECT * FROM review_requests WHERE id = $1', [reviewId]);
        if (reviewResult.rows.length === 0) {
            return res.status(404).send('Review not found after comment');
        }
        const updatedReview = reviewResult.rows[0];

        const fullUpdatedReview = await fetchReviewDetails(reviewId);
        if (!fullUpdatedReview) {
            return res.status(404).send('Review not found after update');
        }
        res.json(fullUpdatedReview);

    } catch (err) {
        console.error('Error posting comment', err);
        res.status(500).send('Internal Server Error');
    }
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
app.get('/api/stage-templates', async (req, res) => {
  try {
    const result = await client.query('SELECT id FROM stage_templates'); // Only fetch IDs
    const templatesData = await Promise.all(result.rows.map(async row => {
      const template = await fetchStageTemplateDetails(row.id);
      return template;
    }));
    res.json(templatesData.filter(Boolean)); // Filter out nulls if any
  } catch (err) {
    console.error('Error fetching stage templates', err);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/api/stage-templates', async (req, res) => {
  const { name, stages, isDefault } = req.body;
  const newTemplateId = uuidv4();

  try {
    await client.query('BEGIN'); // Start transaction

    if (isDefault) {
      await client.query('UPDATE stage_templates SET is_default = false WHERE is_default = true');
    }

    // Insert into stage_templates table
    await client.query(
      'INSERT INTO stage_templates (id, name, is_default) VALUES ($1, $2, $3)',
      [newTemplateId, name, !!isDefault]
    );

    // Insert template stages
    for (const stage of stages) {
      await client.query(
        'INSERT INTO template_stages (id, stage_template_id, name, reviewer_ids, reviewer_count) VALUES ($1, $2, $3, $4, $5)',
        [uuidv4(), newTemplateId, stage.name, stage.reviewerIds, stage.reviewerCount]
      );
    }

    await client.query('COMMIT'); // Commit transaction

    const newTemplate = await fetchStageTemplateDetails(newTemplateId);
    res.status(201).json(newTemplate);

  } catch (err) {
    await client.query('ROLLBACK'); // Rollback transaction on error
    console.error('Error creating stage template', err);
    res.status(500).send('Internal Server Error');
  }
});

app.put('/api/stage-templates/:id', async (req, res) => {
  const { id } = req.params;
  const { name, stages, isDefault } = req.body;

  try {
    await client.query('BEGIN'); // Start transaction

    if (isDefault) {
      await client.query('UPDATE stage_templates SET is_default = false WHERE is_default = true AND id != $1', [id]);
    }

    // Update stage_templates table
    const updateTemplateResult = await client.query(
      'UPDATE stage_templates SET name = $1, is_default = $2 WHERE id = $3 RETURNING *',
      [name, !!isDefault, id]
    );

    if (updateTemplateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).send('Template not found');
    }

    // Delete existing template stages
    await client.query('DELETE FROM template_stages WHERE stage_template_id = $1', [id]);

    // Insert new template stages
    for (const stage of stages) {
      await client.query(
        'INSERT INTO template_stages (id, stage_template_id, name, reviewer_ids, reviewer_count) VALUES ($1, $2, $3, $4, $5)',
        [uuidv4(), id, stage.name, stage.reviewerIds, stage.reviewerCount]
      );
    }

    await client.query('COMMIT'); // Commit transaction

    const updatedTemplate = await fetchStageTemplateDetails(id);
    res.json(updatedTemplate);

  } catch (err) {
    await client.query('ROLLBACK'); // Rollback transaction on error
    console.error('Error updating stage template', err);
    res.status(500).send('Internal Server Error');
  }
});

app.delete('/api/stage-templates/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Delete associated template stages first
    await client.query('DELETE FROM template_stages WHERE stage_template_id = $1', [id]);

    // Delete the stage template
    const result = await client.query('DELETE FROM stage_templates WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).send('Template not found');
    }
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting stage template', err);
    res.status(500).send('Internal Server Error');
  }
});

// Set a template as the default
app.put('/api/stage-templates/:id/default', async (req, res) => {
  const { id } = req.params;

  try {
    await client.query('BEGIN'); // Start transaction

    // Unset the current default
    await client.query('UPDATE stage_templates SET is_default = false WHERE is_default = true');

    // Set the new default
    const result = await client.query('UPDATE stage_templates SET is_default = true WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).send('Template not found');
    }

    await client.query('COMMIT'); // Commit transaction

    res.status(200).json(result.rows[0]);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error setting default template', err);
    res.status(500).send('Internal Server Error');
  }
});


app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});
