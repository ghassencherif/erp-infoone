import { Router } from 'express'
import prisma from '../lib/prisma'
import { authenticate, requireRole, AuthRequest } from '../middleware/auth'

const router = Router()

// Get all users (admin only)
router.get('/', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    res.json(users)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Create user (admin only)
router.post('/', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { name, email, password, role, active } = req.body
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password,
        role,
        active: active !== undefined ? active : true
      }
    })
    res.status(201).json(user)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Update user (admin only)
router.put('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params
    const { name, email, password, role, active } = req.body
    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        name,
        email,
        ...(password ? { password } : {}),
        role,
        active
      }
    })
    res.json(user)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Delete user (admin only)
router.delete('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params
    await prisma.user.delete({ where: { id: parseInt(id) } })
    res.json({ message: 'User deleted' })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

export default router
