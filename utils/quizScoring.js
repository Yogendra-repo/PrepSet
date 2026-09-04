/**
 * Score answers against the question snapshot captured when a quiz starts.
 * @param {Array<{id: number, correct_answer: string}>} questions
 * @param {Record<string, string>|undefined} answers
 * @returns {{score: number, correct: number, incorrect: number, skipped: number, results: Array}}
 */
export function scoreQuiz(questions, answers = {}) {
  let correct = 0;
  let incorrect = 0;
  let skipped = 0;

  const results = questions.map((question) => {
    const submittedAnswer = answers && typeof answers === 'object'
      ? answers[`q_${question.id}`]
      : null;
    const userAnswer = typeof submittedAnswer === 'string'
      ? submittedAnswer.trim().toUpperCase()
      : null;
    const isCorrect = userAnswer !== null
      && userAnswer === question.correct_answer.trim().toUpperCase();

    if (userAnswer === null) {
      skipped++;
    } else if (isCorrect) {
      correct++;
    } else {
      incorrect++;
    }

    return {
      ...question,
      userAnswer,
      isCorrect,
      status: userAnswer === null ? 'skipped' : (isCorrect ? 'correct' : 'incorrect'),
    };
  });

  return {
    score: correct,
    correct,
    incorrect,
    skipped,
    results,
  };
}