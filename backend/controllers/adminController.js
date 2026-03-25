import Test from '../models/Test.js';

function parseQuestion(question, index) {
  return {
    id: String(question.id ?? index + 1),
    question: {
      text: question?.question?.text || '',
      image: question?.question?.image || null,
    },
    options: (question.options || []).map((opt, optIndex) => ({
      id: String(opt.id ?? String.fromCharCode(65 + optIndex)),
      text: opt.text || '',
      image: opt.image || null,
      isCorrect: Boolean(opt.isCorrect),
    })),
    solution: {
      text: question?.solution?.text || '',
      image: question?.solution?.image || null,
    },
    marks: {
      total: Number(question?.marks?.total || 1),
      negative: Number(question?.marks?.negative || 0),
    },
    type: question.type || 'MCQ',
  };
}

export async function getAllTests(req, res, next) {
  try {
    const tests = await Test.find().sort({ createdAt: -1 });
    res.json({ tests });
  } catch (error) {
    next(error);
  }
}

export async function createTest(req, res, next) {
  try {
    const {
      title,
      tags = [],
      durationMinutes,
      totalMarks,
      startTime,
      endTime,
      isApproved = false,
      questions = [],
    } = req.body;

    if (!title || !durationMinutes || !totalMarks || !startTime || !endTime) {
      res.status(400);
      throw new Error('Missing required test fields');
    }

    const test = await Test.create({
      title,
      tags,
      durationMinutes: Number(durationMinutes),
      totalMarks: Number(totalMarks),
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      isApproved: Boolean(isApproved),
      createdBy: req.user._id,
      questions: questions.map((q, i) => parseQuestion(q, i)),
    });

    res.status(201).json({ test });
  } catch (error) {
    next(error);
  }
}

export async function updateApproval(req, res, next) {
  try {
    const { isApproved } = req.body;
    const test = await Test.findByIdAndUpdate(
      req.params.testId,
      { isApproved: Boolean(isApproved) },
      { new: true }
    );

    if (!test) {
      res.status(404);
      throw new Error('Test not found');
    }

    res.json({ test });
  } catch (error) {
    next(error);
  }
}

export async function updateSchedule(req, res, next) {
  try {
    const { startTime, endTime } = req.body;
    const test = await Test.findByIdAndUpdate(
      req.params.testId,
      {
        ...(startTime ? { startTime: new Date(startTime) } : {}),
        ...(endTime ? { endTime: new Date(endTime) } : {}),
      },
      { new: true }
    );

    if (!test) {
      res.status(404);
      throw new Error('Test not found');
    }

    res.json({ test });
  } catch (error) {
    next(error);
  }
}

export async function addQuestion(req, res, next) {
  try {
    const test = await Test.findById(req.params.testId);
    if (!test) {
      res.status(404);
      throw new Error('Test not found');
    }

    const newQuestion = parseQuestion(req.body.question || {}, test.questions.length);
    test.questions.push(newQuestion);
    await test.save();

    res.status(201).json({ test });
  } catch (error) {
    next(error);
  }
}

export async function copyQuestions(req, res, next) {
  try {
    const { fromTestId, questionIds = [] } = req.body;

    const destination = await Test.findById(req.params.testId);
    if (!destination) {
      res.status(404);
      throw new Error('Destination test not found');
    }

    const source = await Test.findById(fromTestId);
    if (!source) {
      res.status(404);
      throw new Error('Source test not found');
    }

    const sourceQuestions = source.questions.filter((q) =>
      questionIds.length ? questionIds.includes(String(q.id)) : true
    );

    if (!sourceQuestions.length) {
      res.status(400);
      throw new Error('No matching questions to copy');
    }

    for (const question of sourceQuestions) {
      destination.questions.push(
        parseQuestion({ ...question.toObject(), id: String(destination.questions.length + 1) }, destination.questions.length)
      );
    }

    await destination.save();

    res.json({ test: destination });
  } catch (error) {
    next(error);
  }
}

export async function uploadImage(req, res, next) {
  try {
    if (!req.file) {
      res.status(400);
      throw new Error('Image file is required');
    }

    const mimeType = req.file.mimetype || 'image/png';
    const base64 = req.file.buffer.toString('base64');

    res.json({
      imageDataUrl: `data:${mimeType};base64,${base64}`,
    });
  } catch (error) {
    next(error);
  }
}
