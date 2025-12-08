import { useState } from 'react';
import './App.css';
import PeopleManager from './components/PeopleManager';
import ReceiptForm from './components/ReceiptForm';
import ItemAssignment from './components/ItemAssignment';
import Settlements from './components/Settlements';

function App() {
  const [people, setPeople] = useState([]);
  const [currentReceipt, setCurrentReceipt] = useState(null);
  const [editingReceipt, setEditingReceipt] = useState(null);
  const [activeTab, setActiveTab] = useState('people');
  const [settlementsRefreshKey, setSettlementsRefreshKey] = useState(0);

  const handleReceiptCreated = (receipt) => {
    setCurrentReceipt(receipt);
    setEditingReceipt(null);
    setActiveTab('assign');
  };

  const handleAssignmentComplete = () => {
    setCurrentReceipt(null);
    setSettlementsRefreshKey(prev => prev + 1); // Force settlements to refresh
    setActiveTab('settlements');
  };

  const handleEditReceipt = (receipt) => {
    setEditingReceipt(receipt);
    setActiveTab('receipt');
  };

  const handleReceiptUpdated = () => {
    setEditingReceipt(null);
    setSettlementsRefreshKey(prev => prev + 1); // Force settlements to refresh
    setActiveTab('settlements');
  };

  const handleReceiptDeleted = () => {
    setSettlementsRefreshKey(prev => prev + 1); // Force settlements to refresh
    setActiveTab('settlements');
  };

  return (
    <div className="app">
      <header>
        <h1>Evenly - Split Bills Fairly</h1>
      </header>

      <nav className="tabs">
        <button
          className={activeTab === 'people' ? 'active' : ''}
          onClick={() => setActiveTab('people')}
        >
          People
        </button>
        <button
          className={activeTab === 'receipt' ? 'active' : ''}
          onClick={() => {
            setEditingReceipt(null);
            setActiveTab('receipt');
          }}
        >
          Add Receipt
        </button>
        <button
          className={activeTab === 'settlements' ? 'active' : ''}
          onClick={() => setActiveTab('settlements')}
        >
          Settlements
        </button>
      </nav>

      <main>
        {activeTab === 'people' && (
          <PeopleManager people={people} onPeopleUpdate={setPeople} />
        )}

        {activeTab === 'receipt' && (
          <ReceiptForm
            people={people}
            onReceiptCreated={handleReceiptCreated}
            onReceiptUpdated={handleReceiptUpdated}
            existingReceipt={editingReceipt}
            onCancelEdit={() => {
              setEditingReceipt(null);
              setActiveTab('settlements');
            }}
          />
        )}

        {activeTab === 'assign' && currentReceipt && (
          <ItemAssignment
            receipt={currentReceipt}
            people={people}
            onComplete={handleAssignmentComplete}
          />
        )}

        {activeTab === 'settlements' && (
          <Settlements
            key={settlementsRefreshKey}
            people={people}
            onEditReceipt={handleEditReceipt}
            onReceiptDeleted={handleReceiptDeleted}
          />
        )}
      </main>
    </div>
  );
}

export default App;
