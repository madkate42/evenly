import { useState, useEffect } from 'react';
import api from '../services/api';

export default function ItemAssignment({ receipt, people, onComplete }) {
  const [assignments, setAssignments] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Initialize assignments structure
  useEffect(() => {
    const initial = {};
    receipt.items.forEach((item) => {
      initial[item.id] = [];
    });
    setAssignments(initial);
  }, [receipt]);

  const addAssignment = (itemId, personId) => {
    const currentAssignments = assignments[itemId] || [];

    // Check if person is already assigned
    const existingIndex = currentAssignments.findIndex((a) => a.personId === personId);
    if (existingIndex >= 0) {
      return; // Person already assigned
    }

    // Add new person and recalculate equal shares
    const newPeople = [...currentAssignments.map(a => a.personId), personId];
    const equalShare = 1 / newPeople.length;
    const newAssignments = newPeople.map((pid) => ({
      personId: pid,
      share: equalShare,
    }));

    setAssignments({
      ...assignments,
      [itemId]: newAssignments,
    });
    setError('');
  };

  const removeAssignment = (itemId, personId) => {
    const currentAssignments = assignments[itemId] || [];
    const remainingPeople = currentAssignments
      .filter((a) => a.personId !== personId)
      .map(a => a.personId);

    // Recalculate equal shares for remaining people
    const equalShare = remainingPeople.length > 0 ? 1 / remainingPeople.length : 0;
    const newAssignments = remainingPeople.map((pid) => ({
      personId: pid,
      share: equalShare,
    }));

    setAssignments({
      ...assignments,
      [itemId]: newAssignments,
    });
  };

  const getItemTotal = (itemId) => {
    return (assignments[itemId] || []).reduce((sum, a) => sum + a.share, 0);
  };

  const getPersonName = (personId) => {
    const person = people.find((p) => p.id === personId);
    return person ? person.displayName : personId;
  };

  const handleSubmit = async () => {
    setError('');

    // Validate all items are fully assigned
    const unassignedItems = receipt.items.filter((item) => {
      const total = getItemTotal(item.id);
      return Math.abs(total - 1.0) > 0.0001;
    });

    if (unassignedItems.length > 0) {
      setError(
        `Some items are not fully assigned: ${unassignedItems.map((i) => i.name).join(', ')}`
      );
      return;
    }

    setLoading(true);
    try {
      const itemAssignments = receipt.items.map((item) => ({
        itemId: item.id,
        assignments: assignments[item.id],
      }));

      await api.addReceipt(receipt, itemAssignments);
      onComplete();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (people.length === 0) {
    return (
      <div className="item-assignment">
        <p className="warning">Please add people first before assigning items.</p>
      </div>
    );
  }

  return (
    <div className="item-assignment">
      <h2>Assign Items</h2>
      <p className="info">Receipt: {receipt.merchant}</p>

      {receipt.items.map((item) => (
        <div key={item.id} className="item-card">
          <div className="item-header">
            <strong>{item.name}</strong>
            <span className="price">
              ${item.price.toFixed(2)} x {item.quantity}
            </span>
          </div>

          <div className="assignment-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${getItemTotal(item.id) * 100}%` }}
              />
            </div>
            <span className="progress-text">{(getItemTotal(item.id) * 100).toFixed(0)}%</span>
          </div>

          <div className="assignments-list">
            {(assignments[item.id] || []).map((assignment) => (
              <div key={assignment.personId} className="assignment-row">
                <span>
                  {getPersonName(assignment.personId)}: {(assignment.share * 100).toFixed(0)}%
                </span>
                <button onClick={() => removeAssignment(item.id, assignment.personId)}>
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="add-assignment">
            <select
              onChange={(e) => {
                if (e.target.value) {
                  addAssignment(item.id, e.target.value);
                  e.target.value = '';
                }
              }}
            >
              <option value="">Add person...</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.displayName}
                </option>
              ))}
            </select>
          </div>
        </div>
      ))}

      {error && <div className="error">{error}</div>}

      <button onClick={handleSubmit} className="submit-btn" disabled={loading}>
        {loading ? 'Submitting...' : 'Submit Receipt'}
      </button>
    </div>
  );
}
