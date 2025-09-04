import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import express from 'express';
import { ReviewRequest, User, ReviewStatusValue } from './src/types';
import { users, reviews } from './src/data'; // Import data

// Vite plugin to run API middleware
const apiMiddlewarePlugin = {
  name: 'api-middleware',
  configureServer: (server) => {
    const app = express();
    app.use(express.json());

    // Auth Simulation
    app.use((req, res, next) => {
      // @ts-ignore
      req.currentUser = users[0];
      next();
    });

    // --- API Endpoints (from backend/src/index.ts) ---

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
            createdAt: new Date().toISOString(),
            author: currentUser,
            ...req.body,
        };
        reviews.push(newReview);
        res.status(201).json(newReview);
    });

    app.put('/api/reviews/:id', (req, res) => {
        const { id } = req.params;
        const reviewIndex = reviews.findIndex(r => r.id === id);

        if (reviewIndex === -1) {
            return res.status(404).send('Review not found');
        }

        // Update the review with the new data
        const originalReview = reviews[reviewIndex];
        const updatedReview = {
            ...originalReview,
            ...req.body,
        };
        reviews[reviewIndex] = updatedReview;

        res.json(updatedReview);
    });

    app.put('/api/reviews/:reviewId/stages/:stageId/assignments/:reviewerId', (req, res) => {
        const { reviewId, stageId, reviewerId } = req.params;
        const { status } = req.body as { status: ReviewStatusValue };

        const review = reviews.find(r => r.id === reviewId);
        if (!review) return res.status(404).send('Review not found');
        const stage = review.stages.find(s => s.id === stageId);
        if (!stage) return res.status(404).send('Stage not found');
        const assignment = stage.assignments.find(a => a.reviewer.id === reviewerId);
        if (!assignment) return res.status(404).send('Assignment not found');

        assignment.status = status;
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
        res.json(review);
    });

    server.middlewares.use(app);
  }
};


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), apiMiddlewarePlugin],
})
