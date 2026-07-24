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

// ============================================================
// CENTRE SELF-SERVICE AUTH
// Verifies the bearer token belongs to a centre, and (when the
// route has an :id param) that the token's centre matches the
// centre being acted on — so a centre can only ever manage its
// own account/profile.
// ============================================================
export const verifyCentreToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    if (decoded.role !== 'centre') {
      return res.status(403).json({ error: 'Centre access required' });
    }
    if (req.params.id && req.params.id !== decoded.id) {
      return res.status(403).json({ error: 'You may only manage your own centre account' });
    }
    (req as any).centre = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ============================================================
// SELLER SELF-SERVICE AUTH
// ============================================================
export const verifySellerToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    if (decoded.role !== 'seller') {
      return res.status(403).json({ error: 'Seller access required' });
    }
    (req as any).seller = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};