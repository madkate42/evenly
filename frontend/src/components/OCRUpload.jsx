import { useState } from 'react';
import { extractTextFromImage } from '../utils/ocr';
import api from '../services/api';

export default function OCRUpload({ paidBy, onReceiptParsed }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(file) {
    setLoading(true);
    setError('');

    try {
      const text = await extractTextFromImage(file);
      const receipt = await api.parseOCR(text, paidBy);
      onReceiptParsed(receipt);
    } catch (err) {
      setError(err.message || 'OCR failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => e.target.files && handleFile(e.target.files[0])}
      />

      {loading && <p>Scanning receipt…</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
