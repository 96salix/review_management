
import express, { Request, Response } from 'express';
import { pool } from '../db';
import { users, stageTemplates } from '../seed/data';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

router.post('/seed', async (req: Request, res: Response) => {
  console.log('Seeding database...');
  try {
    await pool.query('BEGIN');

    // 1. Clear existing data (in reverse order of dependency)
    console.log('Clearing existing data...');
    await pool.query('DELETE FROM activity_logs');
    await pool.query('DELETE FROM comments');
    await pool.query('DELETE FROM review_assignments');
    await pool.query('DELETE FROM review_stages');
    await pool.query('DELETE FROM review_requests');
    await pool.query('DELETE FROM template_stages');
    await pool.query('DELETE FROM stage_templates');
    await pool.query('DELETE FROM users');
    await pool.query('DELETE FROM global_settings');

    // 2. Insert Users
    console.log('Inserting users...');
    for (const user of users) {
      await pool.query(
        'INSERT INTO users (id, name, avatar_url) VALUES ($1, $2, $3)',
        [user.id, user.name, user.avatarUrl]
      );
    }

    // 3. Insert Stage Templates
    console.log('Inserting stage templates...');
    for (const template of stageTemplates) {
      const newTemplateId = uuidv4();
      await pool.query(
        'INSERT INTO stage_templates (id, name, is_default) VALUES ($1, $2, $3)',
        [newTemplateId, template.name, template.isDefault]
      );
      for (const [index, stage] of template.stages.entries()) {
        await pool.query(
          'INSERT INTO template_stages (id, stage_template_id, name, stage_order, reviewer_ids, reviewer_count) VALUES ($1, $2, $3, $4, $5, $6)',
          [uuidv4(), newTemplateId, stage.name, index, stage.reviewerIds, stage.reviewerCount]
        );
      }
    }

    // 4. Insert Review Requests (Dynamically)
    console.log('Inserting review requests...');
    const reviewTitles = [
      '[WIP] Feature: Add new login flow',
      'Fix: Correct calculation in reporting module',
      'Refactor: Improve database query performance',
    ];

    for (let i = 0; i < reviewTitles.length; i++) {
      const reviewId = uuidv4();
      const author = users[i % users.length];
      const createdAt = new Date().toISOString();

      await pool.query(
        'INSERT INTO review_requests (id, title, url, author_id, created_at) VALUES ($1, $2, $3, $4, $5)',
        [reviewId, reviewTitles[i], `http://github.com/example/repo/pull/${i + 1}`, author.id, createdAt]
      );

      // Add a CREATE activity log
      await pool.query(
        'INSERT INTO activity_logs (id, review_request_id, type, user_id, details, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
        [uuidv4(), reviewId, 'CREATE', author.id, `レビュー依頼「${reviewTitles[i]}」を作成しました。`, createdAt]
      );

      // Add stages and assignments
      const numStages = (i % 2) + 2; // 2 or 3 stages
      for (let j = 0; j < numStages; j++) {
        const stageId = uuidv4();
        await pool.query(
          'INSERT INTO review_stages (id, review_request_id, name, stage_order, reviewer_count, due_date) VALUES ($1, $2, $3, $4, $5, $6)',
          [stageId, reviewId, `${j + 1}st Round`, j, 2, null]
        );

        // Add assignments
        const reviewer1 = users[(i + j + 1) % users.length];
        const reviewer2 = users[(i + j + 2) % users.length];
        await pool.query(
          'INSERT INTO review_assignments (id, review_stage_id, reviewer_id, status) VALUES ($1, $2, $3, $4), ($5, $6, $7, $8)',
          [uuidv4(), stageId, reviewer1.id, 'pending', uuidv4(), stageId, reviewer2.id, j === 0 ? 'lgtm' : 'commented']
        );
      }
    }
    
    // 5. Insert Global Settings
    console.log('Inserting global settings...');
    await pool.query(
        'INSERT INTO global_settings (id, service_domain, default_reviewer_count) VALUES (1, \'http://localhost:5174\', 3)'
    );

    await pool.query('COMMIT');
    console.log('Database seeded successfully!');
    res.status(200).send('Database seeded successfully!');
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Error seeding database', err);
    res.status(500).send('Error seeding database');
  }
});

export default router;
