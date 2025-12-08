import { useState, useEffect } from 'react';
import api from '../services/api';
import OCRUpload from './OCRUpload';

export default function ReceiptForm({
  people,
  onReceiptCreated,
  onReceiptUpdated,
  existingReceipt,
  onCancelEdit,
}) {
  const [merchant, setMerchant] = useState('');
  const [items, setItems] = useState([{ name: '', price: '', quantity: 1 }]);
  const [tax, setTax] = useState('');
  const [tip, setTip] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (existingReceipt) {
      setMerchant(existingReceipt.merchant || '');
      // Make a copy of items to avoid mutations
      setItems(existingReceipt.items.map(item => ({ ...item })));
      setTax(existingReceipt.tax ?? '');
      setTip(existingReceipt.tip ?? '');
      setPaidBy(existingReceipt.paidBy ?? '');
    } else {
      // Reset form when not editing
      setMerchant('');
      setItems([{ name: '', price: '', quantity: 1 }]);
      setTax('');
      setTip('');
      setPaidBy('');
    }
  }, [existingReceipt]);

  const updateItem = (i, field, value) => {
    const copy = [...items];
    copy[i] = { ...copy[i], [field]: value };
    setItems(copy);
  };

  const addItem = () => {
    setItems([...items, { name: '', price: '', quantity: 1 }]);
  };

  const removeItem = (i) => {
    if (items.length > 1) {
      setItems(items.filter((_, index) => index !== i));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!merchant.trim()) {
      setError('Merchant is required');
      return;
    }

    if (!paidBy) {
      setError('Please select who paid for this receipt');
      return;
    }

    const validItems = items.filter(i => i.name && i.price !== '');
    if (!validItems.length) {
      setError('At least one item is required');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        merchant: merchant.trim(),
        items: validItems.map(i => ({
          id: i.id, // Use existing ID from the item (will be set by parseManual for new items)
          name: i.name.trim(),
          price: Number(i.price),
          quantity: Number(i.quantity) || 1,
        })),
        paidBy,
        tax: tax !== '' ? Number(tax) : undefined,
        tip: tip !== '' ? Number(tip) : undefined,
      };

      if (existingReceipt) {
        // When editing, update the receipt and go back to settlements
        payload.id = existingReceipt.id; // Preserve receipt ID
        await api.updateReceipt(existingReceipt.id, payload);
        if (onReceiptUpdated) {
          onReceiptUpdated();
        }
      } else {
        // When creating new, parse and go to assignment
        const receipt = await api.parseManual(payload);
        onReceiptCreated(receipt);
      }
    } catch (err) {
      setError(err.message || 'Failed to save receipt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="receipt-form">
      <h2>{existingReceipt ? 'Edit Receipt' : 'Add Receipt'}</h2>

      {existingReceipt && (
        <div className="warning">
          <strong>Note:</strong> Editing only updates merchant, tax, tip, and who paid. To change items or assignments, please delete and recreate the receipt.
        </div>
      )}

      <div className="form-group">
        <label>Paid By</label>
        <select
          value={paidBy}
          onChange={(e) => setPaidBy(e.target.value)}
          disabled={loading}
        >
          <option value="">Select person</option>
          {people.map(p => (
            <option key={p.id} value={p.id}>{p.displayName}</option>
          ))}
        </select>
      </div>

      {!existingReceipt && (
        <>
          <OCRUpload paidBy={paidBy} onReceiptParsed={onReceiptCreated} />
          <div className="divider">or enter manually</div>
        </>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Merchant</label>
          <input
            placeholder="Merchant"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
          />
        </div>

        <div className="items-section">
          <h3>Items</h3>
          {items.map((item, i) => (
            <div key={item.id || i} className="item-row">
              <input
                value={item.name}
                placeholder="Item"
                onChange={(e) => updateItem(i, 'name', e.target.value)}
                disabled={existingReceipt}
              />
              <input
                type="number"
                step="0.01"
                value={item.price}
                placeholder="Price"
                onChange={(e) => updateItem(i, 'price', e.target.value)}
                disabled={existingReceipt}
              />
              <input
                type="number"
                value={item.quantity}
                placeholder="Qty"
                onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                disabled={existingReceipt}
              />
              {!existingReceipt && items.length > 1 && (
                <button type="button" onClick={() => removeItem(i)}>
                  Remove
                </button>
              )}
            </div>
          ))}

          {!existingReceipt && (
            <button type="button" onClick={addItem}>
              Add Item
            </button>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Tax (optional)</label>
            <input
              type="number"
              step="0.01"
              value={tax}
              placeholder="0.00"
              onChange={(e) => setTax(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Tip (optional)</label>
            <input
              type="number"
              step="0.01"
              value={tip}
              placeholder="0.00"
              onChange={(e) => setTip(e.target.value)}
            />
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        <button className="submit-btn" disabled={loading}>
          {existingReceipt ? 'Update Receipt' : 'Create Receipt'}
        </button>

        {existingReceipt && (
          <button className="submit-btn" type="button" onClick={onCancelEdit} style={{ marginTop: '10px', backgroundColor: '#6b7280' }}>
            Cancel
          </button>
        )}
      </form>
    </div>
  );
}
