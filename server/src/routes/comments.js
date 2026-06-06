import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as commentService from '../services/commentService.js';

const router = Router();
router.use(authenticate);

/**
 * GET /api/comments/:taskId
 * Get all comments for a task.
 */
router.get('/:taskId', async (req, res, next) => {
  try {
    const comments = await commentService.getCommentsByTask(req.params.taskId);
    res.json({ comments });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/comments
 * Add a comment to a task.
 * Body: { taskId, content }
 */
router.post('/', async (req, res, next) => {
  try {
    const { taskId, content } = req.body;

    if (!taskId || !content) {
      return res.status(400).json({ error: 'Missing required fields: taskId, content' });
    }

    const comment = await commentService.createComment({
      taskId,
      content,
      authorId: req.user.userId,
      authorName: req.user.name,
    });

    res.status(201).json({ comment });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/comments/:commentId
 * Delete a comment. Only the author can delete.
 */
router.delete('/:commentId', async (req, res, next) => {
  try {
    const comment = await commentService.getCommentById(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Only the comment author or a manager can delete
    if (comment.authorId !== req.user.userId && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'You can only delete your own comments' });
    }

    await commentService.deleteComment(req.params.commentId);
    res.json({ message: 'Comment deleted successfully' });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/comments/:commentId
 * Update a comment. Only the author can update.
 */
router.put('/:commentId', async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const comment = await commentService.getCommentById(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.authorId !== req.user.userId) {
      return res.status(403).json({ error: 'You can only edit your own comments' });
    }

    const updatedComment = await commentService.updateComment(req.params.commentId, content);
    res.json({ comment: updatedComment });
  } catch (err) {
    next(err);
  }
});

export default router;
