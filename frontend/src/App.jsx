import { useState } from 'react';
import './App.css';
import PeopleManager from './components/PeopleManager';
import ReceiptForm from './components/ReceiptForm';
import ItemAssignment from './components/ItemAssignment';
import Settlements from './components/Settlements';

function App() {
  const [people, setPeople] = useState([]);
  const [currentReceipt, setCurrentReceipt] = useState(null);
  const [activeTab, setActiveTab] = useState('people');

  const handleReceiptCreated = (receipt) => {
    setCurrentReceipt(receipt);
    setActiveTab('assign');
  };

  const handleAssignmentComplete = () => {
    setCurrentReceipt(null);
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
          onClick={() => setActiveTab('receipt')}
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
          <ReceiptForm people={people} onReceiptCreated={handleReceiptCreated} />
        )}

        {activeTab === 'assign' && currentReceipt && (
          <ItemAssignment
            receipt={currentReceipt}
            people={people}
            onComplete={handleAssignmentComplete}
          />
        )}

        {activeTab === 'settlements' && <Settlements people={people} />}
      </main>
    </div>
  );
}

export default App;
