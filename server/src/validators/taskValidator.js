import { z } from 'zod';

// Schema for POST /api/tasks
export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(5000).optional().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  deadline: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  assigneeName: z.string().optional().nullable(),
  teamId: z.string().min(1, 'Team ID is required'),
  projectId: z.string().optional().nullable(),
  status: z.enum(['todo', 'in_progress', 'in_review', 'done']).optional(),
  imageKey: z.string().optional().nullable()
});

// Schema for PUT /api/tasks/:taskId
export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  deadline: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  assigneeName: z.string().optional().nullable(),
  teamId: z.string().min(1).optional(),
  projectId: z.string().optional().nullable(),
  status: z.enum(['todo', 'in_progress', 'in_review', 'done']).optional(),
  imageKey: z.string().optional().nullable()
});

// Express middleware to validate requests against a schema
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: result.error.flatten()
    });
  }
  
  // Replace req.body with the validated (and stripped) data
  // This automatically removes any malicious extra fields!
  req.body = result.data; 
  next();
};
