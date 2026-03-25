export function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

export function formatSeconds(total) {
  const t = Math.max(0, Number(total || 0));
  const hours = Math.floor(t / 3600);
  const minutes = Math.floor((t % 3600) / 60);
  const seconds = t % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function buildDefaultQuestion() {
  return {
    id: String(Date.now()),
    question: { text: '', image: null },
    options: [
      { id: 'A', text: '', image: null, isCorrect: true },
      { id: 'B', text: '', image: null, isCorrect: false },
      { id: 'C', text: '', image: null, isCorrect: false },
      { id: 'D', text: '', image: null, isCorrect: false },
    ],
    solution: { text: '', image: null },
    marks: { total: 1, negative: 0 },
    type: 'MCQ',
  };
}
