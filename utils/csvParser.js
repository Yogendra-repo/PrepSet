import fs from 'fs';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

// Normalize header names (strip BOM, lowercase, remove spaces/underscores)
function normalizeHeader(header) {
  if (!header) return '';
  return header.replace(/^\uFEFF/, '').trim().toLowerCase().replace(/[\s_-]/g, '');
}

// Map normalized headers to expected field names
const HEADER_MAP = {
  'question': 'question',
  'questions': 'question',
  'questiontext': 'question',
  'optiona': 'optionA',
  'option1': 'optionA',
  'a': 'optionA',
  'optionb': 'optionB',
  'option2': 'optionB',
  'b': 'optionB',
  'optionc': 'optionC',
  'option3': 'optionC',
  'c': 'optionC',
  'optiond': 'optionD',
  'option4': 'optionD',
  'd': 'optionD',
  'correctanswer': 'correctAnswer',
  'answer': 'correctAnswer',
  'correct': 'correctAnswer',
  'ans': 'correctAnswer',
};

const REQUIRED_FIELDS = ['question', 'optionA', 'optionB', 'optionC', 'optionD', 'correctAnswer'];

/**
 * Normalizes answer string (e.g. 'A', 'a', '(B)', 'Option C', '1' -> 'A', etc.)
 */
function normalizeAnswer(ans) {
  if (!ans) return '';
  const trimmed = ans.trim();
  // Check if starts or matches A, B, C, D
  const letterMatch = trimmed.match(/(?:option\s*)?\(?([A-D])\)?(?:\.|\b)/i);
  if (letterMatch) {
    return letterMatch[1].toUpperCase();
  }
  // Check 1, 2, 3, 4
  const numMap = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
  if (numMap[trimmed]) {
    return numMap[trimmed];
  }
  return trimmed.toUpperCase();
}

/**
 * Parse and validate a CSV file for quiz questions.
 * @param {string} source - Path to the uploaded CSV file or CSV text
 * @param {'file'|'text'} sourceType - Whether source is a file path or CSV text
 * @returns {Promise<{questions: Array, errors: string[]}>}
 */
export function parseQuizCSV(source, sourceType = 'file') {
  return new Promise((resolve, reject) => {
    if (!source || typeof source !== 'string') {
      return resolve({ questions: [], errors: ['No CSV data provided.'] });
    }

    const questions = [];
    const errors = [];
    let rowIndex = 1; // Start at 1 (header is row 0)
    let headersValidated = false;

    const input = sourceType === 'text'
      ? Readable.from([source])
      : fs.createReadStream(source);

    const stream = input
      .pipe(csvParser({
        mapHeaders: ({ header }) => {
          const normalized = normalizeHeader(header);
          return HEADER_MAP[normalized] || header.trim();
        }
      }));

    stream.on('headers', (headers) => {
      const cleanHeaders = headers.map(h => normalizeHeader(h));
      // Check required fields
      const missing = REQUIRED_FIELDS.filter(f => !headers.includes(f));
      if (missing.length > 0) {
        errors.push(`Missing required CSV headers: ${missing.join(', ')}. Expected headers: question, optionA, optionB, optionC, optionD, correctAnswer`);
        stream.destroy();
        resolve({ questions: [], errors });
      } else {
        headersValidated = true;
      }
    });

    stream.on('data', (row) => {
      rowIndex++;

      // Skip completely empty rows
      const values = Object.values(row).map(v => (v ? String(v).trim() : ''));
      if (values.every(v => v === '')) return;

      const q = (row.question ? String(row.question).trim() : '');
      const a = (row.optionA ? String(row.optionA).trim() : '');
      const b = (row.optionB ? String(row.optionB).trim() : '');
      const c = (row.optionC ? String(row.optionC).trim() : '');
      const d = (row.optionD ? String(row.optionD).trim() : '');
      const rawAns = row.correctAnswer ? String(row.correctAnswer).trim() : '';
      const ans = normalizeAnswer(rawAns);

      // Validate required fields
      if (!q) {
        errors.push(`Row ${rowIndex}: 'question' field is empty.`);
        return;
      }
      if (!a) {
        errors.push(`Row ${rowIndex}: 'optionA' field is empty.`);
        return;
      }
      if (!b) {
        errors.push(`Row ${rowIndex}: 'optionB' field is empty.`);
        return;
      }
      if (!c) {
        errors.push(`Row ${rowIndex}: 'optionC' field is empty.`);
        return;
      }
      if (!d) {
        errors.push(`Row ${rowIndex}: 'optionD' field is empty.`);
        return;
      }

      // Validate correctAnswer
      if (!['A', 'B', 'C', 'D'].includes(ans)) {
        errors.push(`Row ${rowIndex}: Invalid correctAnswer "${rawAns}". Expected A, B, C, or D.`);
        return;
      }

      questions.push({
        question_text: q,
        option_a: a,
        option_b: b,
        option_c: c,
        option_d: d,
        correct_answer: ans,
      });
    });

    stream.on('end', () => {
      if (questions.length === 0 && errors.length === 0) {
        errors.push('CSV file is empty or contains no valid questions.');
      }
      resolve({ questions, errors });
    });

    stream.on('error', (err) => {
      reject(new Error(`Failed to parse CSV: ${err.message}`));
    });
  });
}
