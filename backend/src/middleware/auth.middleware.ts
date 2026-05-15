// ============================================================
// backend/src/middleware/auth.middleware.ts
// ============================================================
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const verifyAdminToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    (req as any).admin = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};