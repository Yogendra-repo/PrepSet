import assert from 'node:assert/strict';
import test from 'node:test';
import { parseQuizCSV } from '../utils/csvParser.js';

test('parses supported headers and normalizes answer formats', async () => {
  const csv = [
    'Question Text,Option 1,Option 2,Option 3,Option 4,Answer',
    '"First question","One","Two","Three","Four","2"',
  ].join('\n');

  const result = await parseQuizCSV(csv, 'text');

  assert.deepEqual(result.errors, []);
  assert.equal(result.questions.length, 1);
  assert.equal(result.questions[0].correct_answer, 'B');
  assert.equal(result.questions[0].question_text, 'First question');
});

test('rejects invalid rows without returning them for insertion', async () => {
  const csv = [
    'question,optionA,optionB,optionC,optionD,correctAnswer',
    '"Valid?","A","B","C","D","A"',
    '"Missing option","A","","C","D","B"',
  ].join('\n');

  const result = await parseQuizCSV(csv, 'text');

  assert.equal(result.questions.length, 1);
  assert.match(result.errors[0], /Row 3/);
  assert.match(result.errors[0], /optionB/);
});