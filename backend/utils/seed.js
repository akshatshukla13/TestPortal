import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import Test from '../models/Test.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseFirstNumber(value, fallback = 0) {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return fallback;
  const match = value.match(/[-+]?\d*\.?\d+/);
  return match ? Number(match[0]) : fallback;
}

function mapSeedQuestions(questions = []) {
  return questions.map((q, index) => ({
    id: String(q.id ?? index + 1),
    question: {
      text: q?.question?.text || '',
      image: q?.question?.image || null,
    },
    options: (q.options || []).map((opt, optIndex) => ({
      id: String(opt.id ?? String.fromCharCode(65 + optIndex)),
      text: opt.text || '',
      image: opt.image || null,
      isCorrect: Boolean(opt.isCorrect),
    })),
    solution: {
      text: q?.solution?.text || '',
      image: q?.solution?.image || null,
    },
    marks: {
      total: parseFirstNumber(q?.marks?.totalMarks, 1),
      negative: parseFirstNumber(q?.marks?.negativeMarks, 0),
    },
    type: q.type || 'MCQ',
  }));
}

export async function seedInitialTestData() {
  const existingTests = await Test.countDocuments();
  if (existingTests > 0) return;

  const seedPath = path.resolve(__dirname, '../data/seedTest.json');
  const seedRaw = await fs.readFile(seedPath, 'utf-8');
  const seed = JSON.parse(seedRaw);

  const now = new Date();
  const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  await Test.create({
    title: seed.testName || 'Seed Test',
    tags: ['gate', 'cs', 'full-syllabus', 'seeded'],
    durationMinutes: Number(seed.time || 60),
    totalMarks: Number(seed.totalmarks || 100),
    startTime: now,
    endTime: end,
    isApproved: true,
    questions: mapSeedQuestions(seed.questions || []),
  });

  console.log('Seeded initial test from data/seedTest.json');
}
