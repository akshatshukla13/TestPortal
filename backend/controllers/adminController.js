import Test from '../models/Test.js';
import User from '../models/User.js';

const DEFAULT_TEST_DURATION_MS = 4 * 60 * 60 * 1000; // 4 hours

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
      description = '',
      tags = [],
      durationMinutes,
      totalMarks,
      startTime,
      endTime,
      isApproved = false,
      questions = [],
      category,
      difficultyLevel,
      settings,
    } = req.body;

    if (!title || !durationMinutes || !totalMarks) {
      res.status(400);
      throw new Error('Missing required test fields');
    }

    const now = new Date();
    const test = await Test.create({
      title,
      description,
      tags,
      durationMinutes: Number(durationMinutes),
      totalMarks: Number(totalMarks),
      startTime: startTime ? new Date(startTime) : now,
      endTime: endTime ? new Date(endTime) : new Date(now.getTime() + DEFAULT_TEST_DURATION_MS),
      isApproved: Boolean(isApproved),
      createdBy: req.user._id,
      questions: questions.map((q, i) => parseQuestion(q, i)),
      ...(category ? { category } : {}),
      ...(difficultyLevel ? { difficultyLevel } : {}),
      ...(settings ? { settings } : {}),
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

export async function getDashboardStats(req, res, next) {
  try {
    const now = new Date();
    const allTests = await Test.find().lean();

    const totalTests = allTests.length;
    const activeTests = allTests.filter(
      (t) => t.isApproved && t.startTime <= now && t.endTime >= now
    ).length;
    const upcomingTests = allTests.filter(
      (t) => t.isApproved && t.startTime > now
    ).length;
    const expiredTests = allTests.filter((t) => t.endTime < now).length;
    const inactiveTests = allTests.filter((t) => !t.isApproved).length;
    const totalQuestions = allTests.reduce((sum, t) => sum + (t.questions?.length || 0), 0);

    const totalUsers = await User.countDocuments({ role: 'student' });

    const recentTests = await Test.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('_id title isApproved startTime endTime questions')
      .lean();

    res.json({
      totalTests,
      activeTests,
      inactiveTests,
      upcomingTests,
      expiredTests,
      totalQuestions,
      totalUsers,
      recentTests: recentTests.map((t) => ({
        id: t._id,
        title: t.title,
        isApproved: t.isApproved,
        startTime: t.startTime,
        endTime: t.endTime,
        questionCount: t.questions?.length || 0,
      })),
    });
  } catch (error) {
    next(error);
  }
}

export async function updateTest(req, res, next) {
  try {
    const allowed = [
      'title', 'description', 'tags', 'durationMinutes', 'totalMarks',
      'startTime', 'endTime', 'isApproved', 'category', 'difficultyLevel', 'settings',
    ];

    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (key === 'startTime' || key === 'endTime') {
          updates[key] = new Date(req.body[key]);
        } else {
          updates[key] = req.body[key];
        }
      }
    }

    const test = await Test.findByIdAndUpdate(req.params.testId, updates, { new: true, runValidators: true });
    if (!test) {
      res.status(404);
      throw new Error('Test not found');
    }

    res.json({ test });
  } catch (error) {
    next(error);
  }
}

export async function deleteTest(req, res, next) {
  try {
    const test = await Test.findByIdAndDelete(req.params.testId);
    if (!test) {
      res.status(404);
      throw new Error('Test not found');
    }

    res.json({ message: 'Test deleted successfully' });
  } catch (error) {
    next(error);
  }
}

export async function duplicateTest(req, res, next) {
  try {
    const source = await Test.findById(req.params.testId).lean();
    if (!source) {
      res.status(404);
      throw new Error('Test not found');
    }

    const { _id, createdAt, updatedAt, ...rest } = source;
    const now = new Date();
    const copy = await Test.create({
      ...rest,
      title: `${source.title} (Copy)`,
      isApproved: false,
      createdBy: req.user._id,
      createdAt: undefined,
      updatedAt: undefined,
      startTime: now,
      endTime: new Date(now.getTime() + DEFAULT_TEST_DURATION_MS),
    });

    res.status(201).json({ test: copy });
  } catch (error) {
    next(error);
  }
}

export async function deleteQuestion(req, res, next) {
  try {
    const test = await Test.findById(req.params.testId);
    if (!test) {
      res.status(404);
      throw new Error('Test not found');
    }

    const { questionId } = req.params;
    const index = test.questions.findIndex((q) => String(q.id) === questionId);
    if (index === -1) {
      res.status(404);
      throw new Error('Question not found');
    }

    test.questions.splice(index, 1);
    await test.save();

    res.json({ test });
  } catch (error) {
    next(error);
  }
}

export async function updateQuestion(req, res, next) {
  try {
    const test = await Test.findById(req.params.testId);
    if (!test) {
      res.status(404);
      throw new Error('Test not found');
    }

    const { questionId } = req.params;
    const index = test.questions.findIndex((q) => String(q.id) === questionId);
    if (index === -1) {
      res.status(404);
      throw new Error('Question not found');
    }

    test.questions[index] = parseQuestion({ ...req.body, id: questionId }, index);
    await test.save();

    res.json({ test });
  } catch (error) {
    next(error);
  }
}

export async function listUsers(req, res, next) {
  try {
    const users = await User.find({ role: 'student' })
      .sort({ createdAt: -1 })
      .select('_id name email targetExam isSuspended createdAt')
      .lean();

    res.json({ users });
  } catch (error) {
    next(error);
  }
}

export async function assignUsers(req, res, next) {
  try {
    const { userIds = [], mode = 'replace' } = req.body;

    const test = await Test.findById(req.params.testId);
    if (!test) {
      res.status(404);
      throw new Error('Test not found');
    }

    if (mode === 'replace') {
      test.allowedUsers = userIds;
    } else if (mode === 'add') {
      const existing = test.allowedUsers.map(String);
      for (const id of userIds) {
        if (!existing.includes(String(id))) {
          test.allowedUsers.push(id);
        }
      }
    } else if (mode === 'remove') {
      const removeSet = new Set(userIds.map(String));
      test.allowedUsers = test.allowedUsers.filter((id) => !removeSet.has(String(id)));
    } else {
      res.status(400);
      throw new Error('Invalid mode. Must be replace, add, or remove');
    }

    await test.save();
    res.json({ test });
  } catch (error) {
    next(error);
  }
}

export async function getAssignedUsers(req, res, next) {
  try {
    const test = await Test.findById(req.params.testId)
      .populate('allowedUsers', '_id name email')
      .lean();

    if (!test) {
      res.status(404);
      throw new Error('Test not found');
    }

    res.json({ users: test.allowedUsers });
  } catch (error) {
    next(error);
  }
}
