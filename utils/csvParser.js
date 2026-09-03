import fs from 'fs';
import csvParser from 'csv-parser';

// Normalize header names (lowercase, remove spaces/underscores)
function normalizeHeader(header) {
  return header.toLowerCase().replace(/[\s_-]/g, '');
}

// Map normalized headers to expected field names
const HEADER_MAP = {
  'question': 'question',
  'optiona': 'optionA',
  'optionb': 'optionB',
  'optionc': 'optionC',
  'optiond': 'optionD',
  'correctanswer': 'correctAnswer',
  'answer': 'correctAnswer',
  'correct': 'correctAnswer',
};

const REQUIRED_FIELDS = ['question', 'optionA', 'optionB', 'optionC', 'optionD', 'correctAnswer'];

/**
 * Parse and validate a CSV file for quiz questions.
 * @param {string} filePath - Path to the uploaded CSV file
 * @returns {Promise<{questions: Array, errors: string[]}>}
 */
export function parseQuizCSV(filePath) {
  return new Promise((resolve, reject) => {
    const questions = [];
    const errors = [];
    let rowIndex = 1; // Start at 1 (header is row 0)
    let headersValidated = false;
    let headerMapping = null;

    const stream = fs.createReadStream(filePath)
      .pipe(csvParser({
        mapHeaders: ({ header }) => {
          const normalized = normalizeHeader(header.trim());
          return HEADER_MAP[normalized] || header.trim();
        }
      }));

    stream.on('headers', (headers) => {
      // Check required fields
      const missing = REQUIRED_FIELDS.filter(f => !headers.includes(f));
      if (missing.length > 0) {
        errors.push(`Missing required CSV headers: ${missing.join(', ')}. Expected: question, optionA, optionB, optionC, optionD, correctAnswer`);
        stream.destroy();
        resolve({ questions: [], errors });
      } else {
        headersValidated = true;
      }
    });

    stream.on('data', (row) => {
      rowIndex++;

      // Skip completely empty rows
      const values = Object.values(row).map(v => v?.trim() || '');
      if (values.every(v => v === '')) return;

      const q = row.question?.trim() || '';
      const a = row.optionA?.trim() || '';
      const b = row.optionB?.trim() || '';
      const c = row.optionC?.trim() || '';
      const d = row.optionD?.trim() || '';
      const ans = row.correctAnswer?.trim().toUpperCase() || '';

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
        errors.push(`Row ${rowIndex}: Invalid correctAnswer "${row.correctAnswer}". Expected A, B, C, or D.`);
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
