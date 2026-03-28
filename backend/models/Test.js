import mongoose from 'mongoose';

const optionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    text: { type: String, default: '' },
    image: { type: String, default: null },
    isCorrect: { type: Boolean, default: false },
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    question: {
      text: { type: String, default: '' },
      image: { type: String, default: null },
    },
    options: [optionSchema],
    subject: { type: String, default: 'General' },
    topic: { type: String, default: 'Mixed' },
    difficulty: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      default: 'Beginner',
    },
    section: { type: String, default: 'Core' },
    explanationVideoUrl: { type: String, default: '' },
    solution: {
      text: { type: String, default: '' },
      image: { type: String, default: null },
    },
    marks: {
      total: { type: Number, default: 1 },
      negative: { type: Number, default: 0 },
      partialPositive: { type: Number, default: 0 },
    },
    type: {
      type: String,
      enum: ['MCQ', 'MSQ', 'NAT'],
      default: 'MCQ',
    },
    numerical: {
      answer: { type: Number, default: null },
      tolerance: { type: Number, default: 0 },
      min: { type: Number, default: null },
      max: { type: Number, default: null },
    },
  },
  { _id: false }
);

const sectionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    questionIds: [{ type: String }],
  },
  { _id: false }
);

const testSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    category: {
      type: String,
      enum: ['full-mock', 'subject-wise', 'topic-wise', 'pyq'],
      default: 'full-mock',
    },
    difficultyLevel: {
      type: String,
      enum: ['Easy', 'Moderate', 'Hard', 'Mixed'],
      default: 'Mixed',
    },
    tags: [{ type: String, trim: true }],
    durationMinutes: { type: Number, required: true },
    totalMarks: { type: Number, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    isApproved: { type: Boolean, default: false },
    settings: {
      sectionSwitchingAllowed: { type: Boolean, default: true },
      enableFullscreen: { type: Boolean, default: true },
      trackTabSwitch: { type: Boolean, default: true },
      disableCopyPaste: { type: Boolean, default: true },
      disableKeyboard: { type: Boolean, default: false },
      offlineSaveEnabled: { type: Boolean, default: true },
      warningThresholdMinutes: { type: Number, default: 10 },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    allowedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    sections: [sectionSchema],
    questions: [questionSchema],
  },
  { timestamps: true }
);

const Test = mongoose.model('Test', testSchema);

export default Test;
