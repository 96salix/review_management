import express, { Request, Response } from 'express';
import { pool } from '../db';
import { GlobalSettings } from '../types';

const router = express.Router();

// Get global settings
router.get('/', async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT service_domain, default_reviewer_count FROM global_settings WHERE id = 1');
        if (result.rows.length === 0) {
            // If no settings found, return default values
            return res.json({
                serviceDomain: 'http://localhost:5174',
                defaultReviewerCount: 3,
            });
        }
        const settings = result.rows[0];
        res.json({
            serviceDomain: settings.service_domain,
            defaultReviewerCount: settings.default_reviewer_count,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update global settings
router.put('/', async (req: Request, res: Response) => {
    const { serviceDomain, defaultReviewerCount }: GlobalSettings = req.body;

    if (typeof serviceDomain !== 'string' || typeof defaultReviewerCount !== 'number') {
        return res.status(400).json({ error: 'Invalid input' });
    }

    try {
        const result = await pool.query(
            `UPDATE global_settings 
             SET service_domain = $1, default_reviewer_count = $2 
             WHERE id = 1
             RETURNING service_domain, default_reviewer_count`,
            [serviceDomain, defaultReviewerCount]
        );
        const updatedSettings = result.rows[0];
        res.json({
            serviceDomain: updatedSettings.service_domain,
            defaultReviewerCount: updatedSettings.default_reviewer_count,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;