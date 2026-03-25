import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User.js';
import Attempt from '../models/Attempt.js';
import { createToken } from '../utils/token.js';

function toAuthResponse(user) {
  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      targetExam: user.targetExam,
    },
    token: createToken({ userId: user._id, role: user.role }),
  };
}

export async function signup(req, res, next) {
  try {
    const { name, email, password, role = 'student', targetExam = 'GATE CS' } = req.body;

    if (!name || !email || !password) {
      res.status(400);
      throw new Error('Name, email and password are required');
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      res.status(409);
      throw new Error('User already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: role === 'admin' ? 'admin' : 'student',
      targetExam,
    });

    res.status(201).json(toAuthResponse(user));
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error('Email and password are required');
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(401);
      throw new Error('Invalid credentials');
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      res.status(401);
      throw new Error('Invalid credentials');
    }

    res.json(toAuthResponse(user));
  } catch (error) {
    next(error);
  }
}

export async function me(req, res) {
  const attemptStats = await Attempt.find({ user: req.user._id, status: 'submitted' });
  const totalAttempts = attemptStats.length;
  const averageScore = totalAttempts
    ? attemptStats.reduce((sum, a) => sum + Number(a.score || 0), 0) / totalAttempts
    : 0;

  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      targetExam: req.user.targetExam,
      performanceSummary: {
        totalAttempts,
        averageScore: Number(averageScore.toFixed(2)),
      },
    },
  });
}

export async function updateProfile(req, res, next) {
  try {
    const { name, targetExam } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    if (name) user.name = name;
    if (targetExam) user.targetExam = targetExam;

    await user.save();

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        targetExam: user.targetExam,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400);
      throw new Error('Email is required');
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.json({
        message: 'If this email exists, a reset link has been generated.',
      });
    }

    const resetToken = crypto.randomBytes(24).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordTokenHash = resetTokenHash;
    user.resetPasswordExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();

    res.json({
      message: 'Reset token generated. Integrate with email provider in production.',
      resetToken,
    });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      res.status(400);
      throw new Error('Token and newPassword are required');
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      res.status(400);
      throw new Error('Invalid or expired reset token');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.resetPasswordTokenHash = null;
    user.resetPasswordExpiresAt = null;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    next(error);
  }
}
