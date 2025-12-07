import { useState } from 'react';
import api from '../services/api';
import OCRUpload from './OCRUpload';

export default function ReceiptForm({ people, onReceiptCreated }) {
  const [merchant, setMerchant] = useState('');
  const [items, setItems] = useState([{ name: '', price: '', quantity: 1 }]);
  const [tax, setTax] = useState('');
  const [tip, setTip] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const addItem = () => {
    setItems([...items, { name: '', price: '', quantity: 1 }]);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!merchant.trim()) {
      setError('Merchant name is required');
      return;
    }

    const validItems = items.filter((item) => item.name.trim() && item.price);
    if (validItems.length === 0) {
      setError('At least one item is required');
      return;
    }

    setLoading(true);
    try {
      const receiptData = {
        merchant: merchant.trim(),
        items: validItems.map((item) => ({
          name: item.name.trim(),
          price: parseFloat(item.price),
          quantity: parseInt(item.quantity) || 1,
        })),
      };

      if (tax) receiptData.tax = parseFloat(tax);
      if (tip) receiptData.tip = parseFloat(tip);
      if (paidBy) receiptData.paidBy = paidBy;

      const receipt = await api.parseManual(receiptData);
      onReceiptCreated(receipt);

      // Reset form
      setMerchant('');
      setItems([{ name: '', price: '', quantity: 1 }]);
      setTax('');
      setTip('');
      setPaidBy('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="receipt-form">
      <h2>Add Receipt</h2>
  
      {/* ✅ OCR upload */}
      <OCRUpload
        paidBy={paidBy}
        onReceiptParsed={(receipt) => {
          onReceiptCreated(receipt);
        }}
      />
  
      <div className="divider">or enter manually</div>
  
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Merchant *</label>
          <input
            type="text"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            placeholder="e.g., Starbucks"
            disabled={loading}
          />
        </div>
  
        <div className="form-group">
          <label>Paid By</label>
          <select
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            disabled={loading}
          >
            <option value="">Select person (optional)</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.displayName}
              </option>
            ))}
          </select>
        </div>
  
        <div className="items-section">
          <h3>Items *</h3>
          {items.map((item, index) => (
            <div key={index} className="item-row">
              <input
                type="text"
                value={item.name}
                onChange={(e) => updateItem(index, 'name', e.target.value)}
                placeholder="Item name"
                disabled={loading}
              />
              <input
                type="number"
                value={item.price}
                onChange={(e) => updateItem(index, 'price', e.target.value)}
                placeholder="Price"
                step="0.01"
                min="0"
                disabled={loading}
              />
              <input
                type="number"
                value={item.quantity}
                onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                placeholder="Qty"
                min="1"
                disabled={loading}
              />
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  disabled={loading}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={addItem} disabled={loading}>
            + Add Item
          </button>
        </div>
  
        <div className="form-row">
          <div className="form-group">
            <label>Tax</label>
            <input
              type="number"
              value={tax}
              onChange={(e) => setTax(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              disabled={loading}
            />
          </div>
  
          <div className="form-group">
            <label>Tip</label>
            <input
              type="number"
              value={tip}
              onChange={(e) => setTip(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              disabled={loading}
            />
          </div>
        </div>
  
        {error && <div className="error">{error}</div>}
  
        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? 'Creating...' : 'Create Receipt'}
        </button>
      </form>
    </div>
  );
  

}
