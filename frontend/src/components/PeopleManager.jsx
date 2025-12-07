import { useState } from 'react';
import api from '../services/api';

export default function PeopleManager({ people, onPeopleUpdate }) {
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddPerson = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Name cannot be empty');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const person = await api.addPerson(displayName.trim());
      onPeopleUpdate([...people, person]);
      setDisplayName('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="people-manager">
      <h2>People</h2>

      <form onSubmit={handleAddPerson}>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Enter name"
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Adding...' : 'Add Person'}
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      <div className="people-list">
        {people.length === 0 ? (
          <p className="empty-state">No people added yet</p>
        ) : (
          <ul>
            {people.map((person) => (
              <li key={person.id}>
                <strong>{person.displayName}</strong> ({person.id})
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
