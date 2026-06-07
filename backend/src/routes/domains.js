import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get domains for a project
router.get('/project/:projectId', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT d.* FROM domains d
       JOIN projects p ON d.project_id = p.id
       WHERE d.project_id = $1 AND p.user_id = $2`,
      [req.params.projectId, req.user.userId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch domains' });
  }
});

// Add domain
router.post('/', authenticate, async (req, res) => {
  try {
    const { projectId, domainName, isCustom } = req.body;

    if (!projectId || !domainName) {
      return res.status(400).json({ error: 'Project ID and domain name required' });
    }

    const result = await query(
      'INSERT INTO domains (id, project_id, domain_name, is_custom) VALUES ($1, $2, $3, $4) RETURNING *',
      [uuidv4(), projectId, domainName, isCustom || false]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add domain', details: error.message });
  }
});

// Verify domain
router.post('/:domainId/verify', authenticate, async (req, res) => {
  try {
    const result = await query(
      'UPDATE domains SET verified = true WHERE id = $1 RETURNING *',
      [req.params.domainId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify domain' });
  }
});

export default router;
