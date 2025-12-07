# Evenly Frontend

Basic web UI for the Evenly bill splitting application.

## Prerequisites

- Node.js (v16 or higher recommended)
- Backend server running on `http://localhost:3000`

## Installation

```bash
npm install
```

## Running the App

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or the next available port).

## Features

### 1. People Management
- Add people to the session
- Each person gets a unique ID (p1, p2, p3, etc.)

### 2. Receipt Entry
- Manually enter receipt details
- Add multiple items with prices and quantities
- Optional tax and tip fields
- Select who paid for the receipt

### 3. Item Assignment
- Assign receipt items to people with percentage shares
- Visual progress bars show assignment completion
- Each item must be fully assigned (100%) before submission

### 4. Settlements
- View who owes whom
- See all receipts in the session
- Refresh to get latest calculations

## Usage Flow

1. **Add People**: Start by adding all participants on the "People" tab
2. **Add Receipt**: Go to "Add Receipt" tab and enter receipt details
3. **Assign Items**: After creating a receipt, you'll be directed to assign items to people
4. **Submit**: Once all items are assigned, submit the receipt to the balance
5. **View Settlements**: Check the "Settlements" tab to see who owes whom

## Important Notes

- The backend uses in-memory storage, so data is lost when the server restarts
- All users share the same backend instance (no session isolation)
- Make sure the backend server is running before using the frontend

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── PeopleManager.jsx
│   │   ├── ReceiptForm.jsx
│   │   ├── ItemAssignment.jsx
│   │   └── Settlements.jsx
│   ├── services/
│   │   └── api.js
│   ├── App.jsx
│   ├── App.css
│   └── main.jsx
├── package.json
└── vite.config.js
```

## API Configuration

The frontend connects to the backend at `http://localhost:3000`. To change this, update the `API_BASE_URL` in `src/services/api.js`.
