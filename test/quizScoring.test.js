import assert from 'node:assert/strict';
import test from 'node:test';
import { scoreQuiz } from '../utils/quizScoring.js';

const questions = [
  { id: 1, question_text: 'One', correct_answer: 'A' },
  { id: 2, question_text: 'Two', correct_answer: 'B' },
  { id: 3, question_text: 'Three', correct_answer: 'C' },
];

test('separates correct, incorrect, and skipped answers', () => {
  const result = scoreQuiz(questions, {
    q_1: 'a',
    q_2: 'D',
  });

  assert.equal(result.score, 1);
  assert.equal(result.correct, 1);
  assert.equal(result.incorrect, 1);
  assert.equal(result.skipped, 1);
  assert.deepEqual(result.results.map((item) => item.status), [
    'correct',
    'incorrect',
    'skipped',
  ]);
});

test('treats missing answers as skipped without trusting unknown question IDs', () => {
  const result = scoreQuiz(questions, { q_999: 'A' });

  assert.equal(result.score, 0);
  assert.equal(result.incorrect, 0);
  assert.equal(result.skipped, 3);
});