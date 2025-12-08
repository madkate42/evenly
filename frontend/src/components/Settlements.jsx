import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Settlements({ people, onEditReceipt, onReceiptDeleted }) {
  const [settlements, setSettlements] = useState([]);
  const [balance, setBalance] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [settlementsData, balanceData] = await Promise.all([
        api.getSettlements(),
        api.getBalance(),
      ]);
      setSettlements(settlementsData);
      setBalance(balanceData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getPersonName = (personId) => {
    const person = people.find((p) => p.id === personId);
    return person ? person.displayName : personId;
  };

  const handleDelete = async (id) => {
    await api.deleteReceipt(id);
    await loadData();
    onReceiptDeleted();
  };

  return (
    <div className="settlements">
      <h2>Settlements</h2>

      <button onClick={loadData} disabled={loading}>
        {loading ? 'Refreshing...' : 'Refresh'}
      </button>

      {error && <div className="error">{error}</div>}

      {settlements.length === 0 ? (
        <p className="empty-state">No settlements needed — everyone is settled up!</p>
      ) : (
        <div className="settlements-list">
          {settlements.map((s, i) => (
            <div key={i} className="settlement-card">
              <strong>{getPersonName(s.from)}</strong> →{' '}
              <strong>{getPersonName(s.to)}</strong>
              <div>${s.amount.toFixed(2)}</div>
            </div>
          ))}
        </div>
      )}

      {balance && (
        <div className="balance-summary">
          <h3>Receipts</h3>
          <ul>
            {balance.receipts.map((receipt) => (
              <li key={receipt.id}>
                <strong>{receipt.merchant}</strong> — ${receipt.total.toFixed(2)}
                {receipt.paidBy && ` (paid by ${getPersonName(receipt.paidBy)})`}

                <button
                  onClick={() => handleDelete(receipt.id)}
                  style={{ marginLeft: 8 }}
                >
                  Delete
                </button>

                <button
                  onClick={() => onEditReceipt(receipt)}
                  style={{ marginLeft: 8 }}
                >
                  Edit
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
