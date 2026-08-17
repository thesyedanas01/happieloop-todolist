const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const authMiddleware = require('../middleware/auth');

// Protect all task endpoints with auth
router.use(authMiddleware);

// ─── GET /api/tasks ── Retrieve all tasks for the logged in user ─────
router.get('/', async (req, res) => {
  try {
    // Start of today (midnight) in local time
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Auto-purge any completed tasks completed before today's midnight
    await Task.deleteMany({
      user: req.user._id,
      completed: true,
      completedAt: { $lt: startOfToday },
    });

    const tasks = await Task.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── POST /api/tasks ── Create a task for the logged in user ─────────
router.post('/', async (req, res) => {
  try {
    const { title } = req.body;

    if (!title || !title.trim()) {
      return res
        .status(400)
        .json({ success: false, error: 'Task title is required' });
    }

    const task = await Task.create({
      title: title.trim(),
      user: req.user._id,
      completed: false,
      completedAt: null,
      hiddenFromAll: false,
    });

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res
        .status(400)
        .json({ success: false, error: messages.join(', ') });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── POST /api/tasks/clear-from-all ── Clear completed tasks only from "All" section
router.post('/clear-from-all', async (req, res) => {
  try {
    const result = await Task.updateMany(
      { user: req.user._id, completed: true },
      { $set: { hiddenFromAll: true } }
    );
    res.json({ success: true, data: { modifiedCount: result.modifiedCount } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── PATCH /api/tasks/:id ── Update a task belonging to the user ────
router.patch('/:id', async (req, res) => {
  try {
    const { title, completed, hiddenFromAll } = req.body;
    const updates = {};

    if (title !== undefined) updates.title = title.trim();
    if (completed !== undefined) {
      updates.completed = Boolean(completed);
      updates.completedAt = updates.completed ? new Date() : null;
      if (!updates.completed) {
        // If uncompleting a task, make it visible in All again
        updates.hiddenFromAll = false;
      }
    }
    if (hiddenFromAll !== undefined) {
      updates.hiddenFromAll = Boolean(hiddenFromAll);
    }

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      updates,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!task) {
      return res
        .status(404)
        .json({ success: false, error: 'Task not found or access denied' });
    }

    res.json({ success: true, data: task });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res
        .status(400)
        .json({ success: false, error: 'Invalid task ID' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── DELETE /api/tasks/:id ── Delete a task belonging to user ───────
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!task) {
      return res
        .status(404)
        .json({ success: false, error: 'Task not found or access denied' });
    }

    res.json({ success: true, data: task });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res
        .status(400)
        .json({ success: false, error: 'Invalid task ID' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
