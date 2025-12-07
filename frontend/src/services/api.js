const API_BASE_URL = 'http://localhost:3000';

class ApiService {
  // Parser endpoints
  async parseOCR(ocrData, paidBy) {
    const response = await fetch(`${API_BASE_URL}/api/parser/ocr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ocrData, paidBy }),
    });
    if (!response.ok) throw new Error('Failed to parse OCR data');
    return response.json();
  }

  async parseManual(receiptData) {
    const response = await fetch(`${API_BASE_URL}/api/parser/manual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(receiptData),
    });
    if (!response.ok) throw new Error('Failed to parse manual data');
    return response.json();
  }

  // Itemizer endpoints
  async assignItem(receiptId, itemId, personId, share) {
    const response = await fetch(`${API_BASE_URL}/api/itemizer/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiptId, itemId, personId, share }),
    });
    if (!response.ok) throw new Error('Failed to assign item');
    return response.json();
  }

  async getAssignments(receiptId) {
    const response = await fetch(`${API_BASE_URL}/api/itemizer/assignments/${receiptId}`);
    if (!response.ok) throw new Error('Failed to get assignments');
    return response.json();
  }

  // Balance manager endpoints
  async addPerson(displayName) {
    const response = await fetch(`${API_BASE_URL}/api/balance/person`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName }),
    });
    if (!response.ok) throw new Error('Failed to add person');
    return response.json();
  }

  async addReceipt(receipt, assignments) {
    const response = await fetch(`${API_BASE_URL}/api/balance/receipt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receipt, assignments }),
    });
    if (!response.ok) throw new Error('Failed to add receipt');
    return response.json();
  }

  async getBalance() {
    const response = await fetch(`${API_BASE_URL}/api/balance`);
    if (!response.ok) throw new Error('Failed to get balance');
    return response.json();
  }

  async getSettlements() {
    const response = await fetch(`${API_BASE_URL}/api/balance/settlements`);
    if (!response.ok) throw new Error('Failed to get settlements');
    return response.json();
  }
}

export default new ApiService();
