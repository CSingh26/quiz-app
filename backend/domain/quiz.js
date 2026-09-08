// Server-authoritative quiz contracts. Questions must come from the room's assigned module.
class QuizInputError extends Error {}

function gradeAnswers(answers, questions) {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    throw new QuizInputError('Answers must be an object keyed by assigned question ID');
  }
  const assigned = new Map(questions.map(question => [question.id, question]));
  let score = 0;
  for (const [id, answer] of Object.entries(answers)) {
    const question = assigned.get(id);
    if (!question) throw new QuizInputError('Question does not belong to the assigned test module');
    if (typeof answer !== 'string' || !question.options.some(option => option.text === answer)) {
      throw new QuizInputError('Each answer must be an available option for its question');
    }
    if (question.correct === answer) score += 1;
  }
  return score;
}

function requireOpenRoom(room, now = new Date()) {
  const start = new Date(room.startTime).getTime();
  const end = new Date(room.endTime).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end || now < start || now >= end) {
    throw new QuizInputError('Room is not active at the current time');
  }
}

function validateQuestionFile(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 1000) {
    throw new QuizInputError('Provide between 1 and 1000 questions');
  }
  for (const item of value) {
    if (!item || typeof item.question !== 'string' || !item.question.trim() || item.question.length > 10000 ||
        !Array.isArray(item.options) || item.options.length < 2 || item.options.length > 20 ||
        item.options.some(option => typeof option !== 'string' || !option.trim() || option.length > 5000) ||
        new Set(item.options).size !== item.options.length || typeof item.answer !== 'string' ||
        !item.options.includes(item.answer)) {
      throw new QuizInputError('Each question needs text, 2 to 20 distinct text options and an answer matching an option');
    }
  }
  return value;
}
module.exports = { gradeAnswers, requireOpenRoom, validateQuestionFile, QuizInputError };
