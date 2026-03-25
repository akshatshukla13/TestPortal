import Test from '../models/Test.js';
import Attempt from '../models/Attempt.js';

function isTestLive(test) {
  const now = new Date();
  return test.isApproved && now >= test.startTime && now <= test.endTime;
}

function canResumeOrSubmit(test, attempt) {
  if (isTestLive(test)) return true;
  if (!attempt) return false;
  return attempt.status === 'in_progress' && attempt.startedAt <= test.endTime;
}

function getAnswerMap(answers = []) {
  return new Map(answers.map((a) => [String(a.questionId), a]));
}

function sanitizeQuestionForStudent(q) {
  return {
    id: q.id,
    type: q.type,
    subject: q.subject,
    topic: q.topic,
    difficulty: q.difficulty,
    section: q.section,
    question: q.question,
    options: (q.options || []).map((o) => ({ id: o.id, text: o.text, image: o.image })),
    marks: q.marks,
    numerical: {
      min: q.numerical?.min ?? null,
      max: q.numerical?.max ?? null,
      tolerance: q.numerical?.tolerance ?? 0,
    },
  };
}

function sanitizeTestForStudent(testDoc, attempt = null) {
  const test = testDoc.toObject ? testDoc.toObject() : testDoc;
  return {
    _id: test._id,
    title: test.title,
    category: test.category,
    difficultyLevel: test.difficultyLevel,
    tags: test.tags,
    durationMinutes: test.durationMinutes,
    totalMarks: test.totalMarks,
    startTime: test.startTime,
    endTime: test.endTime,
    isApproved: test.isApproved,
    settings: test.settings,
    sections: test.sections || [],
    attemptStatus: attempt?.status || null,
    lastScore: attempt?.score ?? null,
    questions: (test.questions || []).map((q) => sanitizeQuestionForStudent(q)),
  };
}

function evaluateQuestionScore(question, answerEntry) {
  if (!answerEntry) return 0;

  const total = Number(question.marks?.total || 1);
  const negative = Number(question.marks?.negative || 0);
  const partialPositive = Number(question.marks?.partialPositive || 0);

  if (question.type === 'NAT') {
    const expected = Number(question.numerical?.answer);
    const tolerance = Number(question.numerical?.tolerance || 0);
    const provided = Number(answerEntry.numericAnswer);

    if (Number.isNaN(provided)) return 0;
    return Math.abs(provided - expected) <= tolerance ? total : -negative;
  }

  if (question.type === 'MSQ') {
    const correctSet = new Set((question.options || []).filter((o) => o.isCorrect).map((o) => String(o.id)));
    const selected = new Set((answerEntry.selectedOptionIds || []).map((id) => String(id)));

    if (!selected.size) return 0;

    const hasWrong = [...selected].some((id) => !correctSet.has(id));
    if (hasWrong) return -negative;

    const allCorrectSelected = correctSet.size === selected.size && [...correctSet].every((id) => selected.has(id));
    if (allCorrectSelected) return total;

    if (partialPositive > 0) return partialPositive;

    const ratio = selected.size / Math.max(1, correctSet.size);
    return Number((ratio * total).toFixed(2));
  }

  const selectedId = String(answerEntry.selectedOptionId || '');
  if (!selectedId) return 0;

  const selectedOption = (question.options || []).find((o) => String(o.id) === selectedId);
  if (!selectedOption) return 0;

  return selectedOption.isCorrect ? total : -negative;
}

export async function getAvailableTests(req, res, next) {
  try {
    const now = new Date();
    const tests = await Test.find({
      isApproved: true,
      startTime: { $lte: now },
      endTime: { $gte: now },
    }).sort({ startTime: 1 });

    const attempts = await Attempt.find({
      user: req.user._id,
      test: { $in: tests.map((t) => t._id) },
    });
    const attemptMap = new Map(attempts.map((a) => [String(a.test), a]));

    res.json({
      tests: tests.map((t) => sanitizeTestForStudent(t, attemptMap.get(String(t._id)) || null)),
    });
  } catch (error) {
    next(error);
  }
}

export async function getMyAttempts(req, res, next) {
  try {
    const attempts = await Attempt.find({ user: req.user._id, status: 'submitted' })
      .populate('test', 'title totalMarks durationMinutes tags startTime endTime category difficultyLevel')
      .sort({ submittedAt: -1 });

    res.json({
      attempts: attempts.map((attempt) => ({
        _id: attempt._id,
        test: attempt.test,
        score: attempt.score,
        submittedAt: attempt.submittedAt,
        durationSeconds: attempt.durationSeconds || 0,
      })),
    });
  } catch (error) {
    next(error);
  }
}

export async function getMyDashboardSummary(req, res, next) {
  try {
    const attempts = await Attempt.find({ user: req.user._id, status: 'submitted' }).populate('test');

    const totalAttempts = attempts.length;
    const averageScore = totalAttempts
      ? attempts.reduce((sum, a) => sum + Number(a.score || 0), 0) / totalAttempts
      : 0;

    const totalCorrect = attempts.reduce((sum, a) => {
      const answerCount = (a.answers || []).length;
      return sum + answerCount;
    }, 0);

    const accuracy = totalAttempts
      ? attempts.reduce((sum, a) => {
          const testQuestions = a.test?.questions || [];
          const map = getAnswerMap(a.answers || []);
          let correct = 0;
          let attempted = 0;
          for (const q of testQuestions) {
            const answer = map.get(String(q.id));
            if (!answer) continue;
            if (q.type === 'NAT') {
              if (answer.numericAnswer === null || answer.numericAnswer === undefined) continue;
            } else if (q.type === 'MSQ') {
              if (!(answer.selectedOptionIds || []).length) continue;
            } else if (!answer.selectedOptionId) {
              continue;
            }
            attempted += 1;
            if (evaluateQuestionScore(q, answer) > 0) correct += 1;
          }
          return sum + (attempted ? (correct / attempted) * 100 : 0);
        }, 0) / totalAttempts
      : 0;

    const subjectPerf = {};
    for (const attempt of attempts) {
      const map = getAnswerMap(attempt.answers || []);
      for (const q of attempt.test?.questions || []) {
        const key = q.subject || 'General';
        if (!subjectPerf[key]) {
          subjectPerf[key] = { total: 0, positive: 0 };
        }
        const marks = evaluateQuestionScore(q, map.get(String(q.id)));
        subjectPerf[key].total += 1;
        if (marks > 0) subjectPerf[key].positive += 1;
      }
    }

    const strongSubjects = [];
    const weakSubjects = [];

    Object.entries(subjectPerf).forEach(([subject, info]) => {
      const pct = info.total ? (info.positive / info.total) * 100 : 0;
      const item = { subject, accuracy: Number(pct.toFixed(2)) };
      if (pct >= 70) strongSubjects.push(item);
      if (pct < 50) weakSubjects.push(item);
    });

    res.json({
      summary: {
        totalAttempts,
        averageScore: Number(averageScore.toFixed(2)),
        averageAccuracy: Number(accuracy.toFixed(2)),
        totalAnswered: totalCorrect,
      },
      strongSubjects,
      weakSubjects,
    });
  } catch (error) {
    next(error);
  }
}

export async function getRecommendations(req, res, next) {
  try {
    const summaryResp = await Attempt.find({ user: req.user._id, status: 'submitted' }).populate('test');
    const weakSubjects = {};

    for (const attempt of summaryResp) {
      const map = getAnswerMap(attempt.answers || []);
      for (const q of attempt.test?.questions || []) {
        const subject = q.subject || 'General';
        if (!weakSubjects[subject]) {
          weakSubjects[subject] = { total: 0, positive: 0 };
        }
        weakSubjects[subject].total += 1;
        if (evaluateQuestionScore(q, map.get(String(q.id))) > 0) {
          weakSubjects[subject].positive += 1;
        }
      }
    }

    const weak = Object.entries(weakSubjects)
      .map(([subject, info]) => ({
        subject,
        accuracy: info.total ? (info.positive / info.total) * 100 : 0,
      }))
      .filter((s) => s.accuracy < 55)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 3);

    const recommendedTests = await Test.find({
      isApproved: true,
      ...(weak.length ? { 'questions.subject': { $in: weak.map((w) => w.subject) } } : {}),
    })
      .sort({ startTime: 1 })
      .limit(5);

    res.json({
      weakAreas: weak,
      tests: recommendedTests.map((t) => sanitizeTestForStudent(t)),
    });
  } catch (error) {
    next(error);
  }
}

export async function getTestById(req, res, next) {
  try {
    const test = await Test.findById(req.params.testId);
    if (!test) {
      res.status(404);
      throw new Error('Test not found');
    }

    const existingAttempt = await Attempt.findOne({ user: req.user._id, test: test._id });

    if (req.user.role === 'admin') {
      return res.json({ test, attempt: existingAttempt || null });
    }

    if (!canResumeOrSubmit(test, existingAttempt)) {
      res.status(403);
      throw new Error('Test is not currently available');
    }

    res.json({ test: sanitizeTestForStudent(test, existingAttempt), attempt: existingAttempt || null });
  } catch (error) {
    next(error);
  }
}

export async function startTestSession(req, res, next) {
  try {
    const test = await Test.findById(req.params.testId);
    if (!test) {
      res.status(404);
      throw new Error('Test not found');
    }

    let attempt = await Attempt.findOne({ user: req.user._id, test: test._id });

    if (attempt?.status === 'submitted') {
      res.status(409);
      throw new Error('Test already submitted');
    }

    if (!attempt) {
      if (!isTestLive(test)) {
        res.status(403);
        throw new Error('Test not currently live');
      }
      attempt = await Attempt.create({
        user: req.user._id,
        test: test._id,
        status: 'in_progress',
        startedAt: new Date(),
      });
    }

    res.status(201).json({
      attempt: {
        _id: attempt._id,
        status: attempt.status,
        startedAt: attempt.startedAt,
        lastSavedAt: attempt.lastSavedAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getTestSession(req, res, next) {
  try {
    const test = await Test.findById(req.params.testId);
    if (!test) {
      res.status(404);
      throw new Error('Test not found');
    }

    const attempt = await Attempt.findOne({ user: req.user._id, test: test._id });
    if (!attempt || attempt.status === 'submitted') {
      return res.json({ attempt: null });
    }

    res.json({
      attempt: {
        _id: attempt._id,
        status: attempt.status,
        startedAt: attempt.startedAt,
        lastSavedAt: attempt.lastSavedAt,
        activeQuestionId: attempt.activeQuestionId,
        activeSection: attempt.activeSection,
        answers: attempt.answers,
        questionTimes: attempt.questionTimes,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function saveTestProgress(req, res, next) {
  try {
    const test = await Test.findById(req.params.testId);
    if (!test) {
      res.status(404);
      throw new Error('Test not found');
    }

    const attempt = await Attempt.findOne({ user: req.user._id, test: test._id });
    if (!attempt) {
      res.status(404);
      throw new Error('Session not found. Start the test first.');
    }

    if (attempt.status === 'submitted') {
      res.status(409);
      throw new Error('Cannot update a submitted attempt');
    }

    const {
      answers = [],
      questionTimes = {},
      activeQuestionId = null,
      activeSection = null,
      antiCheat = null,
    } = req.body;

    if (Array.isArray(answers)) {
      attempt.answers = answers.map((a) => ({
        questionId: String(a.questionId),
        selectedOptionId: a.selectedOptionId ? String(a.selectedOptionId) : null,
        selectedOptionIds: (a.selectedOptionIds || []).map(String),
        numericAnswer:
          a.numericAnswer === null || a.numericAnswer === undefined || a.numericAnswer === ''
            ? null
            : Number(a.numericAnswer),
        visited: Boolean(a.visited),
        markedForReview: Boolean(a.markedForReview),
      }));
    }

    attempt.questionTimes = questionTimes || {};
    attempt.activeQuestionId = activeQuestionId;
    attempt.activeSection = activeSection;
    attempt.lastSavedAt = new Date();

    if (antiCheat) {
      attempt.antiCheat = {
        ...attempt.antiCheat,
        ...antiCheat,
      };
    }

    await attempt.save();

    res.json({
      message: 'Progress saved',
      attempt: {
        _id: attempt._id,
        lastSavedAt: attempt.lastSavedAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function submitTest(req, res, next) {
  try {
    const {
      answers = [],
      durationSeconds = 0,
      questionTimes = {},
      antiCheat = {},
      autoSubmitted = false,
    } = req.body;

    const test = await Test.findById(req.params.testId);
    if (!test) {
      res.status(404);
      throw new Error('Test not found');
    }

    let attempt = await Attempt.findOne({ user: req.user._id, test: test._id });

    if (attempt?.status === 'submitted') {
      res.status(409);
      throw new Error('Test already submitted');
    }

    if (!canResumeOrSubmit(test, attempt)) {
      res.status(403);
      throw new Error('Test is not currently available for submission');
    }

    const normalizedAnswers = answers.map((a) => ({
      questionId: String(a.questionId),
      selectedOptionId: a.selectedOptionId ? String(a.selectedOptionId) : null,
      selectedOptionIds: (a.selectedOptionIds || []).map(String),
      numericAnswer:
        a.numericAnswer === null || a.numericAnswer === undefined || a.numericAnswer === ''
          ? null
          : Number(a.numericAnswer),
      visited: Boolean(a.visited),
      markedForReview: Boolean(a.markedForReview),
    }));

    const answerMap = getAnswerMap(normalizedAnswers);

    let score = 0;
    for (const q of test.questions || []) {
      score += evaluateQuestionScore(q, answerMap.get(String(q.id)));
    }

    if (!attempt) {
      attempt = await Attempt.create({
        user: req.user._id,
        test: test._id,
        status: 'submitted',
        answers: normalizedAnswers,
        questionTimes,
        score: Number(score.toFixed(2)),
        durationSeconds: Number(durationSeconds || 0),
        antiCheat: {
          fullScreenExitCount: Number(antiCheat.fullScreenExitCount || 0),
          visibilityHiddenCount: Number(antiCheat.visibilityHiddenCount || 0),
          blurCount: Number(antiCheat.blurCount || 0),
          blockedShortcutCount: Number(antiCheat.blockedShortcutCount || 0),
          contextMenuCount: Number(antiCheat.contextMenuCount || 0),
          copyPasteCount: Number(antiCheat.copyPasteCount || 0),
          autoSubmitted: Boolean(autoSubmitted),
        },
        submittedAt: new Date(),
      });
    } else {
      attempt.answers = normalizedAnswers;
      attempt.questionTimes = questionTimes || {};
      attempt.score = Number(score.toFixed(2));
      attempt.durationSeconds = Number(durationSeconds || 0);
      attempt.status = 'submitted';
      attempt.lastSavedAt = new Date();
      attempt.submittedAt = new Date();
      attempt.antiCheat = {
        ...attempt.antiCheat,
        fullScreenExitCount: Number(antiCheat.fullScreenExitCount || attempt.antiCheat.fullScreenExitCount || 0),
        visibilityHiddenCount: Number(antiCheat.visibilityHiddenCount || attempt.antiCheat.visibilityHiddenCount || 0),
        blurCount: Number(antiCheat.blurCount || attempt.antiCheat.blurCount || 0),
        blockedShortcutCount: Number(antiCheat.blockedShortcutCount || attempt.antiCheat.blockedShortcutCount || 0),
        contextMenuCount: Number(antiCheat.contextMenuCount || attempt.antiCheat.contextMenuCount || 0),
        copyPasteCount: Number(antiCheat.copyPasteCount || attempt.antiCheat.copyPasteCount || 0),
        autoSubmitted: Boolean(autoSubmitted),
      };
      await attempt.save();
    }

    res.status(201).json({
      attemptId: attempt._id,
      score: attempt.score,
      totalMarks: test.totalMarks,
    });
  } catch (error) {
    next(error);
  }
}

export async function getMyAnalysis(req, res, next) {
  try {
    const test = await Test.findById(req.params.testId);
    if (!test) {
      res.status(404);
      throw new Error('Test not found');
    }

    const attempt = await Attempt.findOne({ user: req.user._id, test: test._id, status: 'submitted' });
    if (!attempt) {
      res.status(404);
      throw new Error('Attempt not found');
    }

    const allAttempts = await Attempt.find({ test: test._id, status: 'submitted' }).sort({
      score: -1,
      submittedAt: 1,
    });
    const topperAttempt = allAttempts[0] || null;
    const totalAttempts = allAttempts.length;

    const perQuestionStats = new Map();
    for (const q of test.questions || []) {
      perQuestionStats.set(String(q.id), {
        attempts: 0,
        correct: 0,
        avgTimeSeconds: 0,
      });
    }

    for (const eachAttempt of allAttempts) {
      const eachAnswerMap = getAnswerMap(eachAttempt.answers || []);
      const attemptedCount = (eachAttempt.answers || []).filter((a) => {
        if (a.selectedOptionId) return true;
        if ((a.selectedOptionIds || []).length) return true;
        if (a.numericAnswer !== null && a.numericAnswer !== undefined) return true;
        return false;
      }).length;

      const fallbackPerQuestionTime = attemptedCount
        ? Number(eachAttempt.durationSeconds || 0) / attemptedCount
        : 0;

      for (const q of test.questions || []) {
        const key = String(q.id);
        const stats = perQuestionStats.get(key);
        if (!stats) continue;

        const answer = eachAnswerMap.get(key);
        if (!answer) continue;

        const hasAttempt =
          Boolean(answer.selectedOptionId) ||
          Boolean((answer.selectedOptionIds || []).length) ||
          (answer.numericAnswer !== null && answer.numericAnswer !== undefined);

        if (!hasAttempt) continue;

        stats.attempts += 1;
        const explicitTime = Number(eachAttempt.questionTimes?.get?.(key) || eachAttempt.questionTimes?.[key] || 0);
        stats.avgTimeSeconds += explicitTime > 0 ? explicitTime : fallbackPerQuestionTime;

        if (evaluateQuestionScore(q, answer) > 0) {
          stats.correct += 1;
        }
      }
    }

    for (const stats of perQuestionStats.values()) {
      if (stats.attempts > 0) {
        stats.avgTimeSeconds = stats.avgTimeSeconds / stats.attempts;
      }
    }

    const answerMap = getAnswerMap(attempt.answers || []);
    const topperAnswerMap = getAnswerMap(topperAttempt?.answers || []);

    let correct = 0;
    let incorrect = 0;
    let unattempted = 0;
    let positiveMarks = 0;
    let negativeMarks = 0;

    const questionAnalysis = (test.questions || []).map((q) => {
      const key = String(q.id);
      const stats = perQuestionStats.get(key) || {
        attempts: 0,
        correct: 0,
        avgTimeSeconds: 0,
      };

      const answer = answerMap.get(key) || null;
      const topperAnswer = topperAnswerMap.get(key) || null;

      const hasAttempt =
        answer &&
        (Boolean(answer.selectedOptionId) ||
          Boolean((answer.selectedOptionIds || []).length) ||
          (answer.numericAnswer !== null && answer.numericAnswer !== undefined));

      const marksAwarded = hasAttempt ? evaluateQuestionScore(q, answer) : 0;
      if (!hasAttempt) {
        unattempted += 1;
      } else if (marksAwarded > 0) {
        correct += 1;
        positiveMarks += marksAwarded;
      } else {
        incorrect += 1;
        negativeMarks += Math.abs(marksAwarded);
      }

      const correctOptionIds = (q.options || []).filter((o) => o.isCorrect).map((o) => o.id);

      return {
        questionId: q.id,
        questionText: q.question?.text || '',
        questionImage: q.question?.image || null,
        type: q.type,
        subject: q.subject,
        topic: q.topic,
        section: q.section,
        selectedOptionId: answer?.selectedOptionId || null,
        selectedOptionIds: answer?.selectedOptionIds || [],
        numericAnswer: answer?.numericAnswer ?? null,
        correctOptionId: correctOptionIds[0] || null,
        correctOptionIds,
        options: (q.options || []).map((opt) => ({ id: opt.id, text: opt.text, image: opt.image })),
        solution: {
          text: q.solution?.text || '',
          image: q.solution?.image || null,
        },
        isCorrect: hasAttempt ? marksAwarded > 0 : false,
        marksAwarded: Number(marksAwarded.toFixed(2)),
        attemptRate: totalAttempts ? (stats.attempts / totalAttempts) * 100 : 0,
        accuracyRate: stats.attempts ? (stats.correct / stats.attempts) * 100 : 0,
        avgTimeSeconds: Number((stats.avgTimeSeconds || 0).toFixed(2)),
        topperScore: Number(topperAttempt?.score || 0),
        topperTimeSeconds:
          topperAttempt && topperAttempt.answers?.length
            ? Number(
                (
                  Number(topperAttempt.durationSeconds || 0) /
                  Math.max(
                    1,
                    topperAttempt.answers.filter((a) => {
                      if (a.selectedOptionId) return true;
                      if ((a.selectedOptionIds || []).length) return true;
                      if (a.numericAnswer !== null && a.numericAnswer !== undefined) return true;
                      return false;
                    }).length
                  )
                ).toFixed(2)
              )
            : 0,
        topperSelectedOptionId: topperAnswer?.selectedOptionId || null,
      };
    });

    const attempted = correct + incorrect;
    const totalQuestions = (test.questions || []).length || 0;
    const accuracy = attempted ? (correct / attempted) * 100 : 0;
    const completion = totalQuestions ? (attempted / totalQuestions) * 100 : 0;
    const percentage = test.totalMarks ? (attempt.score / test.totalMarks) * 100 : 0;

    const rank = allAttempts.findIndex((a) => String(a._id) === String(attempt._id)) + 1;
    const percentile = totalAttempts ? ((totalAttempts - rank + 1) / totalAttempts) * 100 : 0;
    const averageScore = totalAttempts
      ? allAttempts.reduce((sum, a) => sum + Number(a.score || 0), 0) / totalAttempts
      : 0;

    const durationSeconds = Number(attempt.durationSeconds || 0);
    const speed = durationSeconds ? (attempted / durationSeconds) * 60 : 0;

    const scoreDistribution = {
      low: allAttempts.filter((a) => Number(a.score) < test.totalMarks * 0.35).length,
      medium: allAttempts.filter(
        (a) => Number(a.score) >= test.totalMarks * 0.35 && Number(a.score) < test.totalMarks * 0.7
      ).length,
      high: allAttempts.filter((a) => Number(a.score) >= test.totalMarks * 0.7).length,
    };

    const topScores = allAttempts.slice(0, 10).map((a, index) => ({
      rank: index + 1,
      score: Number(a.score || 0),
      durationSeconds: Number(a.durationSeconds || 0),
    }));

    res.json({
      test: {
        _id: test._id,
        title: test.title,
        category: test.category,
        difficultyLevel: test.difficultyLevel,
        durationMinutes: test.durationMinutes,
        totalMarks: test.totalMarks,
        totalQuestions,
      },
      summary: {
        score: attempt.score,
        totalMarks: test.totalMarks,
        percentage: Number(percentage.toFixed(2)),
        correct,
        incorrect,
        unattempted,
        attempted,
        totalQuestions,
        positiveMarks: Number(positiveMarks.toFixed(2)),
        negativeMarks: Number(negativeMarks.toFixed(2)),
        accuracy: Number(accuracy.toFixed(2)),
        completion: Number(completion.toFixed(2)),
      },
      benchmark: {
        rank,
        totalAttempts,
        percentile: Number(percentile.toFixed(2)),
        averageScore: Number(averageScore.toFixed(2)),
        scoreDistribution,
        topScores,
        topperScore: Number(topperAttempt?.score || 0),
      },
      timing: {
        durationSeconds,
        speedQuestionsPerMinute: Number(speed.toFixed(2)),
      },
      antiCheat: attempt.antiCheat || {},
      questionAnalysis,
    });
  } catch (error) {
    next(error);
  }
}

export async function getMyResult(req, res, next) {
  try {
    const test = await Test.findById(req.params.testId);
    if (!test) {
      res.status(404);
      throw new Error('Test not found');
    }

    const attempt = await Attempt.findOne({ user: req.user._id, test: test._id, status: 'submitted' });
    if (!attempt) {
      res.status(404);
      throw new Error('Attempt not found');
    }

    const answerMap = getAnswerMap(attempt.answers || []);

    const review = (test.questions || []).map((q) => {
      const answer = answerMap.get(String(q.id));
      const correctOption = (q.options || []).find((o) => o.isCorrect);
      const correctOptionIds = (q.options || []).filter((o) => o.isCorrect).map((o) => o.id);

      return {
        questionId: q.id,
        selectedOptionId: answer?.selectedOptionId || null,
        selectedOptionIds: answer?.selectedOptionIds || [],
        numericAnswer: answer?.numericAnswer ?? null,
        correctOptionId: correctOption ? correctOption.id : null,
        correctOptionIds,
        isCorrect: evaluateQuestionScore(q, answer) > 0,
      };
    });

    res.json({
      attempt: {
        _id: attempt._id,
        score: attempt.score,
        submittedAt: attempt.submittedAt,
      },
      test: {
        _id: test._id,
        title: test.title,
        totalMarks: test.totalMarks,
      },
      review,
    });
  } catch (error) {
    next(error);
  }
}
