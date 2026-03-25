import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    selectedOptionId: { type: String, default: null },
    selectedOptionIds: [{ type: String }],
    numericAnswer: { type: Number, default: null },
    visited: { type: Boolean, default: false },
    markedForReview: { type: Boolean, default: false },
  },
  { _id: false }
);

const attemptSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    test: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true },
    answers: [answerSchema],
    questionTimes: {
      type: Map,
      of: Number,
      default: {},
    },
    status: {
      type: String,
      enum: ['in_progress', 'submitted'],
      default: 'in_progress',
    },
    startedAt: { type: Date, default: Date.now },
    lastSavedAt: { type: Date, default: Date.now },
    activeQuestionId: { type: String, default: null },
    activeSection: { type: String, default: null },
    score: { type: Number, default: 0 },
    durationSeconds: { type: Number, default: 0 },
    antiCheat: {
      fullScreenExitCount: { type: Number, default: 0 },
      visibilityHiddenCount: { type: Number, default: 0 },
      blurCount: { type: Number, default: 0 },
      blockedShortcutCount: { type: Number, default: 0 },
      contextMenuCount: { type: Number, default: 0 },
      copyPasteCount: { type: Number, default: 0 },
      autoSubmitted: { type: Boolean, default: false },
    },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

attemptSchema.index({ user: 1, test: 1 }, { unique: true });

const Attempt = mongoose.model('Attempt', attemptSchema);

export default Attempt;
