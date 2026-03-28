import QuestionBank from '../models/QuestionBank.js';

function sanitizeQB(doc) {
  const q = doc.toObject ? doc.toObject() : doc;
  return {
    _id: q._id,
    question: q.question,
    options: q.options || [],
    type: q.type,
    numerical: q.numerical,
    marks: q.marks,
    solution: q.solution,
    subject: q.subject,
    topic: q.topic,
    difficulty: q.difficulty,
    section: q.section,
    tags: q.tags || [],
    createdAt: q.createdAt,
  };
}

export async function listQuestionBank(req, res, next) {
  try {
    const { subject, topic, difficulty, type, search, tag, tags, page = 1, limit = 50 } = req.query;

    const filter = {};
    if (subject) filter.subject = subject;
    if (topic) filter.topic = topic;
    if (difficulty) filter.difficulty = difficulty;
    if (type) filter.type = type;
    if (tag || tags) {
      const raw = tag ?? tags;
      const parsedTags = String(raw)
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      if (parsedTags.length === 1) {
        filter.tags = parsedTags[0];
      } else if (parsedTags.length > 1) {
        filter.tags = { $in: parsedTags };
      }
    }
    if (search) {
      // Escape special regex characters to prevent ReDoS
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter['question.text'] = { $regex: escaped, $options: 'i' };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      QuestionBank.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      QuestionBank.countDocuments(filter),
    ]);

    res.json({ questions: items.map(sanitizeQB), total, page: Number(page) });
  } catch (error) {
    next(error);
  }
}

export async function createBankQuestion(req, res, next) {
  try {
    const {
      question,
      options = [],
      type = 'MCQ',
      numerical,
      marks,
      solution,
      subject = 'General',
      topic = 'Mixed',
      difficulty = 'Beginner',
      section = 'Core',
      tags = [],
    } = req.body;

    if (!question?.text) {
      res.status(400);
      throw new Error('Question text is required');
    }

    const optId = (i) => String.fromCharCode(65 + i);
    const parsedOptions = options.map((opt, i) => ({
      id: String(opt.id ?? optId(i)),
      text: opt.text || '',
      image: opt.image || null,
      isCorrect: Boolean(opt.isCorrect),
    }));

    const item = await QuestionBank.create({
      question: { text: question.text, image: question.image || null },
      options: parsedOptions,
      type,
      numerical: {
        answer: numerical?.answer ?? null,
        tolerance: numerical?.tolerance ?? 0,
        min: numerical?.min ?? null,
        max: numerical?.max ?? null,
      },
      marks: {
        total: Number(marks?.total ?? 1),
        negative: Number(marks?.negative ?? 0),
        partialPositive: Number(marks?.partialPositive ?? 0),
      },
      solution: { text: solution?.text || '', image: solution?.image || null },
      subject,
      topic,
      difficulty,
      section,
      tags,
      createdBy: req.user._id,
    });

    res.status(201).json({ question: sanitizeQB(item) });
  } catch (error) {
    next(error);
  }
}

export async function updateBankQuestion(req, res, next) {
  try {
    const item = await QuestionBank.findById(req.params.questionId);
    if (!item) {
      res.status(404);
      throw new Error('Question not found in bank');
    }

    const {
      question,
      options,
      type,
      numerical,
      marks,
      solution,
      subject,
      topic,
      difficulty,
      section,
      tags,
    } = req.body;

    if (question !== undefined) {
      item.question = { text: question.text || item.question.text, image: question.image ?? item.question.image };
    }
    if (options !== undefined) {
      const optId = (i) => String.fromCharCode(65 + i);
      item.options = options.map((opt, i) => ({
        id: String(opt.id ?? optId(i)),
        text: opt.text || '',
        image: opt.image || null,
        isCorrect: Boolean(opt.isCorrect),
      }));
    }
    if (type !== undefined) item.type = type;
    if (numerical !== undefined) item.numerical = { ...item.numerical, ...numerical };
    if (marks !== undefined) item.marks = { ...item.marks, ...marks };
    if (solution !== undefined) item.solution = { text: solution.text ?? item.solution.text, image: solution.image ?? item.solution.image };
    if (subject !== undefined) item.subject = subject;
    if (topic !== undefined) item.topic = topic;
    if (difficulty !== undefined) item.difficulty = difficulty;
    if (section !== undefined) item.section = section;
    if (tags !== undefined) item.tags = tags;

    await item.save();
    res.json({ question: sanitizeQB(item) });
  } catch (error) {
    next(error);
  }
}

export async function deleteBankQuestion(req, res, next) {
  try {
    const item = await QuestionBank.findByIdAndDelete(req.params.questionId);
    if (!item) {
      res.status(404);
      throw new Error('Question not found in bank');
    }
    res.json({ message: 'Question deleted from bank' });
  } catch (error) {
    next(error);
  }
}

export async function addBankQuestionsToTest(req, res, next) {
  try {
    const { questionIds = [] } = req.body;

    if (!questionIds.length) {
      res.status(400);
      throw new Error('No question IDs provided');
    }

    const bankItems = await QuestionBank.find({ _id: { $in: questionIds } });
    if (!bankItems.length) {
      res.status(404);
      throw new Error('No matching questions found in bank');
    }

    const { default: Test } = await import('../models/Test.js');
    const test = await Test.findById(req.params.testId);
    if (!test) {
      res.status(404);
      throw new Error('Test not found');
    }

    for (const bq of bankItems) {
      const newId = String(test.questions.length + 1);
      test.questions.push({
        id: newId,
        question: { text: bq.question.text, image: bq.question.image || null },
        options: bq.options.map((o) => ({ id: o.id, text: o.text, image: o.image, isCorrect: o.isCorrect })),
        type: bq.type,
        numerical: bq.numerical,
        marks: bq.marks,
        solution: bq.solution,
        subject: bq.subject,
        topic: bq.topic,
        difficulty: bq.difficulty,
        section: bq.section || 'Core',
        tags: bq.tags || [],
      });
    }

    await test.save();
    res.json({ test, addedCount: bankItems.length });
  } catch (error) {
    next(error);
  }
}

export async function getDistinctSubjects(req, res, next) {
  try {
    const subjects = await QuestionBank.distinct('subject');
    res.json({ subjects });
  } catch (error) {
    next(error);
  }
}
