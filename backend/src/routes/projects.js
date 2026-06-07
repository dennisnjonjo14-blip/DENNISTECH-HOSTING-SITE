import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get all projects for user
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get single project
router.get('/:projectId', authenticate, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
      [req.params.projectId, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Create project
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description, gitRepository, language, framework } = req.body;

    if (!name || !language) {
      return res.status(400).json({ error: 'Name and language are required' });
    }

    const result = await query(
      'INSERT INTO projects (id, user_id, name, description, git_repository, language, framework) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [uuidv4(), req.user.userId, name, description, gitRepository, language, framework]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create project', details: error.message });
  }
});

// Update project
router.put('/:projectId', authenticate, async (req, res) => {
  try {
    const { name, description, gitRepository, framework, visibility } = req.body;

    const result = await query(
      'UPDATE projects SET name = $1, description = $2, git_repository = $3, framework = $4, visibility = $5, updated_at = NOW() WHERE id = $6 AND user_id = $7 RETURNING *',
      [name, description, gitRepository, framework, visibility, req.params.projectId, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete project
router.delete('/:projectId', authenticate, async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.projectId, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

export default router;
