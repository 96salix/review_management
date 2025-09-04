import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import express from 'express';
import { ReviewRequest, User, ReviewStatusValue, ActivityLog } from './src/types'; // Import ActivityLog
import { users, reviews, stageTemplates } from './src/data'; // Import data

// Helper to generate unique IDs for logs
let logIdCounter = 1000;
const generateLogId = () => `log-${logIdCounter++}`;

// Vite plugin to run API middleware
const apiMiddlewarePlugin = {
  name: 'api-middleware',
  configureServer: (server) => {
    const app = express();
    app.use(express.json());

    // Auth Simulation
    app.use((req, res, next) => {
      // @ts-ignore
      req.currentUser = users[0]; // Alice is always the current user
      next();
    });

    // --- API Endpoints ---

    app.get('/api/reviews', (req, res) => {
      res.json(reviews);
    });

    app.get('/api/reviews/:id', (req, res) => {
      const review = reviews.find(r => r.id === req.params.id);
      if (review) {
        res.json(review);
      } else {
        res.status(404).send('Review not found');
      }
    });
    
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

    app.put('/api/reviews/:id', (req, res) => {
        const { id } = req.params;
        const reviewIndex = reviews.findIndex(r => r.id === id);

        if (reviewIndex === -1) {
            return res.status(404).send('Review not found');
        }

        const originalReview = reviews[reviewIndex];
        const updatedReview = {
            ...originalReview,
            ...req.body,
        };
        reviews[reviewIndex] = updatedReview;

        // For simplicity, not adding a detailed UPDATE log here as content can be complex.
        // If needed, a more sophisticated diffing logic would be required.

        res.json(updatedReview);
    });

    app.put('/api/reviews/:reviewId/stages/:stageId/assignments/:reviewerId', (req, res) => {
        // @ts-ignore
        const currentUser = req.currentUser as User;
        const { reviewId, stageId, reviewerId } = req.params;
        const { status } = req.body as { status: ReviewStatusValue };

        const review = reviews.find(r => r.id === reviewId);
        if (!review) return res.status(404).send('Review not found');
        const stage = review.stages.find(s => s.id === stageId);
        if (!stage) return res.status(404).send('Stage not found');
        const assignment = stage.assignments.find(a => a.reviewer.id === reviewerId);
        if (!assignment) return res.status(404).send('Assignment not found');

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

    app.post('/api/reviews/:reviewId/stages/:stageId/comments', (req, res) => {
        // @ts-ignore
        const currentUser = req.currentUser as User;
        const { reviewId, stageId } = req.params;
        const { content, lineNumber } = req.body;

        const review = reviews.find(r => r.id === reviewId);
        if (!review) return res.status(404).send('Review not found');
        const stage = review.stages.find(s => s.id === stageId);
        if (!stage) return res.status(404).send('Stage not found');

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
      users.push(newUser); // Directly push to the imported users array
      res.status(201).json(newUser);
    });

    app.put('/api/users/:id', (req, res) => {
      const { id } = req.params;
      const userIndex = users.findIndex(u => u.id === id);
      if (userIndex === -1) {
        return res.status(404).send('User not found');
      }
      const updatedUser = { ...users[userIndex], ...req.body };
      users[userIndex] = updatedUser; // Directly update the imported users array
      res.json(updatedUser);
    });

    app.delete('/api/users/:id', (req, res) => {
      const { id } = req.params;
      const initialLength = users.length;
      // Reassign the imported users array
      users.splice(0, users.length, ...users.filter(u => u.id !== id)); // Use splice to modify in place
      if (users.length === initialLength) {
        return res.status(404).send('User not found');
      }
      res.status(204).send(); // No Content
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
      const initialLength = stageTemplates.length;
      stageTemplates = stageTemplates.filter(t => t.id !== id);
      if (stageTemplates.length === initialLength) {
        return res.status(404).send('Template not found');
      }
      res.status(204).send(); // No Content
    });

    server.middlewares.use(app);
  }
};


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), apiMiddlewarePlugin],
})
