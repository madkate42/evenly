import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Settlements({ people }) {
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

  return (
    <div className="settlements">
      <h2>Settlements</h2>
      <button onClick={loadData} disabled={loading}>
        {loading ? 'Refreshing...' : 'Refresh'}
      </button>

      {error && <div className="error">{error}</div>}

      {settlements.length === 0 ? (
        <p className="empty-state">No settlements needed - everyone is settled up!</p>
      ) : (
        <div className="settlements-list">
          {settlements.map((settlement, index) => (
            <div key={index} className="settlement-card">
              <div className="settlement-info">
                <strong>{getPersonName(settlement.from)}</strong>
                <span className="arrow">→</span>
                <strong>{getPersonName(settlement.to)}</strong>
              </div>
              <div className="settlement-amount">${settlement.amount.toFixed(2)}</div>
            </div>
          ))}
        </div>
      )}

      {balance && (
        <div className="balance-summary">
          <h3>Summary</h3>
          <p>Total people: {balance.persons.length}</p>
          <p>Total receipts: {balance.receipts.length}</p>
          {balance.receipts.length > 0 && (
            <div className="receipts-list">
              <h4>Receipts</h4>
              <ul>
                {balance.receipts.map((receipt) => (
                  <li key={receipt.id}>
                    <strong>{receipt.merchant}</strong> - ${receipt.total.toFixed(2)}
                    {receipt.paidBy && ` (paid by ${getPersonName(receipt.paidBy)})`}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
