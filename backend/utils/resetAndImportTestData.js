import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

import User from '../models/User.js';
import Test from '../models/Test.js';
import Attempt from '../models/Attempt.js';
import QuestionBank from '../models/QuestionBank.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ quiet: true });

const ADMIN_EMAIL = (process.env.ADMIN1_EMAIL || 'admin1@gmail.com').toLowerCase();
const USER_EMAIL = (process.env.USER1_EMAIL || 'user1@gmail.com').toLowerCase();

function parseFirstNumber(value, fallback = 0) {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return fallback;
  const match = value.match(/[-+]?\d*\.?\d+/);
  if (!match) return fallback;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNumberOr(value, fallback = null) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((tag) => String(tag).trim())
    .filter(Boolean);
}

function parseNatFromSolutionText(solutionText) {
  if (typeof solutionText !== 'string') {
    return {
      extracted: false,
      answer: null,
      tolerance: null,
      min: null,
      max: null,
      cleanedText: solutionText || '',
    };
  }

  const raw = solutionText.trim();
  const match = raw.match(
    /^\s*solution\s*[:\-]?\s*([-+]?\d*\.?\d+)\s*(?:(?:to|\-|–)\s*([-+]?\d*\.?\d+))?/i,
  );

  if (!match) {
    return {
      extracted: false,
      answer: null,
      tolerance: null,
      min: null,
      max: null,
      cleanedText: solutionText,
    };
  }

  const first = Number(match[1]);
  const second = match[2] !== undefined ? Number(match[2]) : null;
  const suffix = raw.slice(match[0].length).replace(/^\s*[:\-]?\s*/, '').trim();

  if (!Number.isFinite(first)) {
    return {
      extracted: false,
      answer: null,
      tolerance: null,
      min: null,
      max: null,
      cleanedText: solutionText,
    };
  }

  if (Number.isFinite(second)) {
    const min = Math.min(first, second);
    const max = Math.max(first, second);
    const answer = Number(((min + max) / 2).toFixed(6));
    const tolerance = Number(((max - min) / 2).toFixed(6));
    return {
      extracted: true,
      answer,
      tolerance,
      min,
      max,
      cleanedText: suffix,
    };
  }

  return {
    extracted: true,
    answer: first,
    tolerance: 0,
    min: null,
    max: null,
    cleanedText: suffix,
  };
}

function mapQuestion(raw, index) {
  const type = raw?.type || 'MCQ';
  const legacyNat =
    type === 'NAT' && (raw?.numerical?.answer ?? raw?.numericalAnswer) == null
      ? parseNatFromSolutionText(raw?.solution?.text || '')
      : { extracted: false, cleanedText: raw?.solution?.text || '' };

  const explicitAnswer = toNumberOr(raw?.numerical?.answer ?? raw?.numericalAnswer, null);
  const explicitTolerance = toNumberOr(raw?.numerical?.tolerance, null);
  const explicitMin = toNumberOr(raw?.numerical?.min, null);
  const explicitMax = toNumberOr(raw?.numerical?.max, null);

  const natAnswer = explicitAnswer ?? (legacyNat.extracted ? legacyNat.answer : null);
  const natTolerance = explicitTolerance ?? (legacyNat.extracted ? legacyNat.tolerance : 0);
  const natMin = explicitMin ?? (legacyNat.extracted ? legacyNat.min : null);
  const natMax = explicitMax ?? (legacyNat.extracted ? legacyNat.max : null);

  return {
    id: String(raw?.id ?? index + 1),
    question: {
      text: raw?.question?.text || '',
      image: raw?.question?.image || null,
    },
    options: (raw?.options || []).map((opt, optIndex) => ({
      id: String(opt?.id ?? String.fromCharCode(65 + optIndex)),
      text: opt?.text || '',
      image: opt?.image || null,
      isCorrect: Boolean(opt?.isCorrect),
    })),
    subject: raw?.subject || 'General',
    topic: raw?.topic || 'Mixed',
    difficulty: raw?.difficulty || 'Beginner',
    section: raw?.section || 'Core',
    tags: normalizeTags(raw?.tags),
    explanationVideoUrl: raw?.explanationVideoUrl || '',
    solution: {
      text: legacyNat.extracted ? legacyNat.cleanedText : (raw?.solution?.text || ''),
      image: raw?.solution?.image || null,
    },
    marks: {
      total: toNumberOr(raw?.marks?.total, parseFirstNumber(raw?.marks?.totalMarks, 1)),
      negative: toNumberOr(raw?.marks?.negative, parseFirstNumber(raw?.marks?.negativeMarks, 0)),
      partialPositive: toNumberOr(raw?.marks?.partialPositive, 0),
    },
    type,
    numerical: {
      answer: natAnswer,
      tolerance: natTolerance,
      min: natMin,
      max: natMax,
    },
  };
}

function collectTestTags(testName, fileStem, questions) {
  const tags = new Set(['imported', fileStem.toLowerCase()]);
  if (testName) {
    for (const token of String(testName).toLowerCase().split(/[^a-z0-9]+/g)) {
      if (token.length >= 3 && token.length <= 15) tags.add(token);
      if (tags.size >= 8) break;
    }
  }
  for (const q of questions) {
    for (const tag of q.tags || []) {
      tags.add(tag.toLowerCase());
      if (tags.size >= 12) break;
    }
    if (tags.size >= 12) break;
  }
  return Array.from(tags);
}

async function ensureUser({ email, name, role, targetExam, password }) {
  const existing = await User.findOne({ email });
  if (existing) {
    let changed = false;
    if (existing.name !== name) {
      existing.name = name;
      changed = true;
    }
    if (existing.role !== role) {
      existing.role = role;
      changed = true;
    }
    if (existing.targetExam !== targetExam) {
      existing.targetExam = targetExam;
      changed = true;
    }
    if (!existing.passwordHash) {
      existing.passwordHash = await bcrypt.hash(password, 10);
      changed = true;
    }
    if (changed) await existing.save();
    return existing;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  return User.create({
    name,
    email,
    passwordHash,
    role,
    targetExam,
  });
}

async function importTestFile({ fileName, adminUserId, defaultStartTime, defaultEndTime }) {
  const filePath = path.resolve(__dirname, '../../testData', fileName);
  const raw = await fs.readFile(filePath, 'utf-8');
  const parsed = JSON.parse(raw);

  const mappedQuestions = (parsed?.questions || []).map(mapQuestion);
  const fileStem = path.parse(fileName).name;

  const testDoc = {
    title: parsed?.testName || fileStem,
    description: `Imported from testData/${fileName}`,
    category: 'full-mock',
    difficultyLevel: 'Mixed',
    tags: collectTestTags(parsed?.testName, fileStem, mappedQuestions),
    durationMinutes: Number(parsed?.time || 180),
    totalMarks: Number(parsed?.totalmarks || mappedQuestions.reduce((sum, q) => sum + Number(q.marks?.total || 0), 0) || 100),
    startTime: defaultStartTime,
    endTime: defaultEndTime,
    isApproved: true,
    createdBy: adminUserId,
    questions: mappedQuestions,
  };

  const createdTest = await Test.create(testDoc);

  const qbDocs = mappedQuestions.map((q) => ({
    question: q.question,
    options: q.options,
    type: q.type,
    numerical: q.numerical,
    marks: q.marks,
    solution: q.solution,
    subject: q.subject,
    topic: q.topic,
    difficulty: q.difficulty,
    section: q.section,
    tags: q.tags,
    createdBy: adminUserId,
  }));

  if (qbDocs.length > 0) {
    await QuestionBank.insertMany(qbDocs, { ordered: false });
  }

  return { createdTest, importedQuestionCount: qbDocs.length };
}

async function run() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is required');
  }

  await mongoose.connect(mongoUri);

  const adminPassword = process.env.ADMIN1_PASSWORD || 'admin123';
  const userPassword = process.env.USER1_PASSWORD || 'user123';

  const adminUser = await ensureUser({
    email: ADMIN_EMAIL,
    name: 'Admin 1',
    role: 'admin',
    targetExam: 'GATE CS',
    password: adminPassword,
  });

  const studentUser = await ensureUser({
    email: USER_EMAIL,
    name: 'User 1',
    role: 'student',
    targetExam: 'GATE CS',
    password: userPassword,
  });

  await User.deleteMany({ email: { $nin: [ADMIN_EMAIL, USER_EMAIL] } });

  await Promise.all([
    Attempt.deleteMany({}),
    Test.deleteMany({}),
    QuestionBank.deleteMany({}),
  ]);

  const now = new Date();
  const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const imports = [];
  for (const fileName of ['test9.json', 'test10.json']) {
    // eslint-disable-next-line no-await-in-loop
    const result = await importTestFile({
      fileName,
      adminUserId: adminUser._id,
      defaultStartTime: now,
      defaultEndTime: end,
    });
    imports.push({
      fileName,
      title: result.createdTest.title,
      questionCount: result.createdTest.questions.length,
    });
  }

  console.log('Reset/import completed successfully.');
  console.log(`Kept users: ${ADMIN_EMAIL}, ${USER_EMAIL}`);
  console.log(`Admin id: ${adminUser._id}`);
  console.log(`Student id: ${studentUser._id}`);
  for (const item of imports) {
    console.log(`Imported ${item.fileName} as "${item.title}" with ${item.questionCount} questions.`);
  }
  console.log('Question bank was repopulated from imported tests under admin1 ownership.');
}

run()
  .catch((error) => {
    console.error('Failed to reset/import test data:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch {
      // no-op
    }
  });
