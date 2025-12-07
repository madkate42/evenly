import Tesseract from 'tesseract.js';

export async function extractTextFromImage(file) {
  const result = await Tesseract.recognize(file, 'eng', {
    logger: () => {}, // disable logs
  });

  return result.data.text || '';
}
