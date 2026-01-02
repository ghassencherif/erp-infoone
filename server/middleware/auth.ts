import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  user?: {
    id: number
    email: string
    role: string
  }
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.cookies.token

  console.log('Auth middleware - cookies:', req.cookies)
  console.log('Auth middleware - token:', token)

  if (!token) {
    console.log('No token found in cookies')
    return res.status(401).json({ error: 'Unauthorized - No token' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any
    req.user = decoded
    console.log('Token verified, user:', decoded)
    next()
  } catch (error) {
    console.log('Token verification failed:', error)
    return res.status(401).json({ error: 'Invalid token' })
  }
}

export const requireRole = (role: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (req.user.role !== role) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    next()
  }
}
