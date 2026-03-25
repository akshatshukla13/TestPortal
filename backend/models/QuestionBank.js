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

const questionBankSchema = new mongoose.Schema(
  {
    question: {
      text: { type: String, required: true },
      image: { type: String, default: null },
    },
    options: [optionSchema],
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
    marks: {
      total: { type: Number, default: 1 },
      negative: { type: Number, default: 0 },
      partialPositive: { type: Number, default: 0 },
    },
    solution: {
      text: { type: String, default: '' },
      image: { type: String, default: null },
    },
    subject: { type: String, default: 'General' },
    topic: { type: String, default: 'Mixed' },
    difficulty: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      default: 'Beginner',
    },
    section: { type: String, default: 'Core' },
    tags: [{ type: String, trim: true }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const QuestionBank = mongoose.model('QuestionBank', questionBankSchema);

export default QuestionBank;
