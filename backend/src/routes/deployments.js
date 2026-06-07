import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get deployments for a project
router.get('/project/:projectId', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT d.* FROM deployments d
       JOIN projects p ON d.project_id = p.id
       WHERE d.project_id = $1 AND p.user_id = $2
       ORDER BY d.created_at DESC LIMIT 50`,
      [req.params.projectId, req.user.userId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch deployments' });
  }
});

// Create deployment
router.post('/', authenticate, async (req, res) => {
  try {
    const { projectId, commitSha } = req.body;

    const deploymentId = uuidv4();

    const result = await query(
      'INSERT INTO deployments (id, project_id, commit_sha, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [deploymentId, projectId, commitSha, 'building']
    );

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`logs:${projectId}`).emit('deployment:started', result.rows[0]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create deployment', details: error.message });
  }
});

// Get deployment logs
router.get('/:deploymentId/logs', authenticate, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM deployment_logs WHERE deployment_id = $1 ORDER BY timestamp ASC',
      [req.params.deploymentId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Update deployment status
router.patch('/:deploymentId/status', authenticate, async (req, res) => {
  try {
    const { status, logs } = req.body;

    const result = await query(
      'UPDATE deployments SET status = $1, build_logs = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [status, logs, req.params.deploymentId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update deployment' });
  }
});

export default router;
