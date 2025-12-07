# Evenly API Specification

Complete API reference for the Evenly backend service.

## Base URL
```
http://localhost:3000
```

---

## Table of Contents
- [Data Models](#data-models)
- [Parser Endpoints](#parser-endpoints)
- [Itemizer Endpoints](#itemizer-endpoints)
- [Balance Manager Endpoints](#balance-manager-endpoints)
- [Error Responses](#error-responses)
- [Important Notes](#important-notes)

---

## Data Models

### ReceiptItem
```typescript
{
  id: string;           // Auto-generated UUID
  name: string;         // Item name
  price: number;        // Item price (single unit)
  quantity: number;     // Quantity purchased
}
```

### Receipt
```typescript
{
  id: string;           // Auto-generated UUID
  merchant: string;     // Merchant/store name
  date: Date;           // Receipt date (ISO 8601 string in JSON)
  items: ReceiptItem[]; // Array of receipt items
  subtotal: number;     // Sum of all items before tax/tip
  total: number;        // Final total amount
  paidBy: string;       // Person ID who paid for this receipt
  discounts?: number;   // Optional: discount amount
  tax?: number;         // Optional: tax amount
  tip?: number;         // Optional: tip amount
}
```

### PersonShare
```typescript
{
  personId: string;     // ID of person assigned to this item
  share: number;        // Share of item (0.0 to 1.0)
}
```

### ItemAssignment
```typescript
{
  itemId: string;              // Receipt item ID
  assignments: PersonShare[];  // Array of people sharing this item
}
```

### Person
```typescript
{
  id: string;           // Auto-generated (p1, p2, p3, ...)
  displayName: string;  // Person's name or label
}
```

### Settlement
```typescript
{
  from: string;         // Person ID who owes money
  to: string;           // Person ID who should receive money
  amount: number;       // Amount to be settled (rounded to 2 decimals)
}
```

### Balance
```typescript
{
  persons: Person[];                           // All people in the session
  receipts: Receipt[];                         // All receipts added
  assignments: Map<string, ItemAssignment[]>;  // receiptId -> assignments
  settlements: Settlement[];                   // Calculated settlements
}
```

---

## Parser Endpoints

### Parse OCR Data
Parse receipt text from OCR (Optical Character Recognition).

**Endpoint:** `POST /api/parser/ocr`

**Request Body:**
```json
{
  "ocrData": "CHIPOTLE\n123 MAIN ST\n12/07/2025\nBURRITO  12.50\nGUACOMOLE  3.25\nSUBTOTAL  15.75\nTAX  1.42\nTIP  3.00\nTOTAL  20.17",
  "paidBy": "p1"  // Optional: person ID who paid
}
```

**Response:** `200 OK`
```json
{
  "id": "uuid-here",
  "merchant": "CHIPOTLE",
  "date": "2025-12-07T00:00:00.000Z",
  "items": [
    {
      "id": "uuid-1",
      "name": "BURRITO",
      "price": 12.50,
      "quantity": 1
    },
    {
      "id": "uuid-2",
      "name": "GUACAMOLE",
      "price": 3.25,
      "quantity": 1
    }
  ],
  "subtotal": 15.75,
  "tax": 1.42,
  "tip": 3.00,
  "total": 20.17,
  "paidBy": "p1"
}
```

**OCR Parsing Logic:**
- First non-empty line is extracted as merchant name
- Searches for date patterns (MM/DD/YYYY, YYYY-MM-DD)
- Identifies items by pattern: "ITEM NAME  $X.XX" or "ITEM NAME  X.XX"
- Extracts subtotal, tax, tip, total from keyword patterns
- Calculates subtotal from items if not found in text
- Auto-generates UUIDs for receipt and items

**Error Response:** `500 Internal Server Error`
```json
{
  "error": "Failed to parse OCR data"
}
```

---

### Parse Manual Data
Parse manually entered receipt data.

**Endpoint:** `POST /api/parser/manual`

**Request Body:**
```json
{
  "merchant": "Starbucks",
  "date": "2025-12-07",  // Optional: defaults to now
  "items": [
    {
      "name": "Latte",
      "price": 5.50,
      "quantity": 2
    },
    {
      "name": "Croissant",
      "price": 3.75,
      "quantity": 1
    }
  ],
  "tax": 1.28,      // Optional
  "tip": 2.50,      // Optional
  "paidBy": "p2"    // Optional
}
```

**Response:** `200 OK`
```json
{
  "id": "uuid-here",
  "merchant": "Starbucks",
  "date": "2025-12-07T00:00:00.000Z",
  "items": [
    {
      "id": "uuid-1",
      "name": "Latte",
      "price": 5.50,
      "quantity": 2
    },
    {
      "id": "uuid-2",
      "name": "Croissant",
      "price": 3.75,
      "quantity": 1
    }
  ],
  "subtotal": 14.75,  // Auto-calculated from items
  "tax": 1.28,
  "tip": 2.50,
  "total": 18.53,     // Auto-calculated: subtotal + tax + tip
  "paidBy": "p2"
}
```

**Validation:**
- `merchant` (required): Must be a non-empty string
- `items` (required): Must be an array with at least one item
- Each item must have `name` and `price`
- `quantity` defaults to 1 if not provided
- `subtotal` is auto-calculated from items if not provided
- `total` is auto-calculated as subtotal + tax + tip if not provided
- All monetary values are rounded to 2 decimal places

**Error Response:** `500 Internal Server Error`
```json
{
  "error": "Failed to parse manual data"
}
```

---

## Itemizer Endpoints

### Assign Item to Person
Assign a share of an item to a person.

**Endpoint:** `POST /api/itemizer/assign`

**Request Body:**
```json
{
  "receiptId": "r1",
  "itemId": "i1",
  "personId": "p1",
  "share": 0.5
}
```

**Response:** `200 OK`
```json
{
  "success": true
}
```

**Validation:**
- `share` must be between 0.0 and 1.0
- Total shares for an item cannot exceed 1.0
- Throws error if over-assigned

**Error Response:** `500 Internal Server Error`
```json
{
  "error": "Failed to assign item"
}
```

**Error Example (Over-assignment):**
If item `i1` already has 0.6 assigned and you try to assign 0.5 more:
```json
{
  "error": "Failed to assign item"
}
```

---

### Get Assignments for Receipt
Retrieve all item assignments for a specific receipt.

**Endpoint:** `GET /api/itemizer/assignments/:receiptId`

**Response:** `200 OK`
```json
[
  {
    "itemId": "i1",
    "assignments": [
      {
        "personId": "p1",
        "share": 0.5
      },
      {
        "personId": "p2",
        "share": 0.5
      }
    ]
  },
  {
    "itemId": "i2",
    "assignments": [
      {
        "personId": "p3",
        "share": 1.0
      }
    ]
  }
]
```

**Empty Response:** If no assignments exist for the receipt:
```json
[]
```

**Error Response:** `500 Internal Server Error`
```json
{
  "error": "Failed to get assignments"
}
```

---

## Balance Manager Endpoints

### Add Person
Create a new person in the session.

**Endpoint:** `POST /api/balance/person`

**Request Body:**
```json
{
  "displayName": "Alice"
}
```

**Response:** `200 OK`
```json
{
  "id": "p1",
  "displayName": "Alice"
}
```

**ID Generation:**
- Person IDs are auto-incremented: p1, p2, p3, ...
- IDs increment globally per BalanceManager instance

**Error Response:** `500 Internal Server Error`
```json
{
  "error": "Failed to add person"
}
```

---

### Add Receipt
Add a receipt with item assignments to the balance.

**Endpoint:** `POST /api/balance/receipt`

**Request Body:**
```json
{
  "receipt": {
    "id": "r1",
    "merchant": "Pizza Place",
    "date": "2025-12-07T00:00:00.000Z",
    "items": [
      {
        "id": "i1",
        "name": "Pepperoni Pizza",
        "price": 20,
        "quantity": 1
      },
      {
        "id": "i2",
        "name": "Caesar Salad",
        "price": 12,
        "quantity": 1
      }
    ],
    "subtotal": 32,
    "tax": 3,
    "tip": 6,
    "total": 41,
    "paidBy": "p2"
  },
  "assignments": [
    {
      "itemId": "i1",
      "assignments": [
        { "personId": "p1", "share": 0.5 },
        { "personId": "p2", "share": 0.5 }
      ]
    },
    {
      "itemId": "i2",
      "assignments": [
        { "personId": "p3", "share": 1.0 }
      ]
    }
  ]
}
```

**Response:** `200 OK`
```json
{
  "success": true
}
```

**Important:**
- All items in the receipt should have corresponding assignments
- All assignments should sum to 1.0 per item (validated by Itemizer.validateAssignments)
- Tax, tip, and discounts are distributed proportionally based on each person's subtotal

**Error Response:** `500 Internal Server Error`
```json
{
  "error": "Failed to add receipt"
}
```

---

### Get Balance
Retrieve the complete balance state.

**Endpoint:** `GET /api/balance`

**Response:** `200 OK`
```json
{
  "persons": [
    { "id": "p1", "displayName": "Alice" },
    { "id": "p2", "displayName": "Bob" }
  ],
  "receipts": [
    {
      "id": "r1",
      "merchant": "Pizza Place",
      "date": "2025-12-07T00:00:00.000Z",
      "items": [...],
      "subtotal": 32,
      "tax": 3,
      "tip": 6,
      "total": 41,
      "paidBy": "p2"
    }
  ],
  "assignments": {
    "r1": [
      {
        "itemId": "i1",
        "assignments": [
          { "personId": "p1", "share": 0.5 },
          { "personId": "p2", "share": 0.5 }
        ]
      }
    ]
  },
  "settlements": []
}
```

**Note:** `assignments` is a Map serialized as an object with receiptId keys.

**Error Response:** `500 Internal Server Error`
```json
{
  "error": "Failed to get balance"
}
```

---

### Calculate Settlements
Calculate optimized settlements (who owes whom).

**Endpoint:** `GET /api/balance/settlements`

**Response:** `200 OK`
```json
[
  {
    "from": "p1",
    "to": "p2",
    "amount": 20.50
  },
  {
    "from": "p3",
    "to": "p2",
    "amount": 15.75
  }
]
```

**Settlement Algorithm:**
1. Calculate each person's share of each receipt (including proportional tax/tip/discounts)
2. Build net balances (who owes vs who is owed)
3. Use greedy optimization to minimize number of transactions
4. Amounts are rounded to 2 decimal places

**Proportional Calculation Example:**
```
Receipt: subtotal=$30, tax=$3, tip=$6, total=$39
Alice: $10 items → owes $10 + (10/30)*$3 + (10/30)*$6 = $13
Bob: $20 items → owes $20 + (20/30)*$3 + (20/30)*$6 = $26
```

**Empty Response:** If all balances are settled (everyone paid their own):
```json
[]
```

**Error Response:** `500 Internal Server Error`
```json
{
  "error": "Failed to calculate settlements"
}
```

---

## Error Responses

All errors follow this format:

**Status:** `500 Internal Server Error`
```json
{
  "error": "Error message description"
}
```

### Common Error Scenarios

1. **Parser - Invalid OCR data:** Malformed text that cannot be parsed
2. **Parser - Missing required fields:** Manual data missing merchant or items
3. **Itemizer - Invalid share:** Share < 0 or > 1
4. **Itemizer - Over-assignment:** Total shares for item exceed 1.0
5. **Balance - General errors:** Unexpected failures in calculation

---

## Important Notes

### State Management
- **BalanceManager is stateful**: Single instance persists across all requests
- **Itemizer is stateful**: Single instance persists across all requests
- **No persistence layer**: Data is stored in-memory only
- **Session per server instance**: Restarting the server clears all data

### Design Implications for UI
1. **No session ID**: Currently no way to isolate different user sessions
2. **Shared state**: All users share the same BalanceManager instance
3. **Production consideration**: Need to implement session management or database persistence

### Assignment Model
- **Item-centric**: Assignments are grouped by item, not by person
- **Share-based**: Use decimal values (0.5 = 50%, 1.0 = 100%)
- **Validation**: Total shares per item must equal 1.0 (±0.0001 tolerance for floating point)

### Money Calculations
- All monetary values are rounded to 2 decimal places
- Tax, tip, and discounts are applied proportionally based on each person's subtotal share
- Discounts reduce the subtotal before tax/tip calculations

### ID Generation
- **Persons:** Auto-increment (p1, p2, p3, ...)
- **Receipts:** UUID v4
- **Items:** UUID v4

### Validation Rules
- **Share values:** Must be 0.0 ≤ share ≤ 1.0
- **Total shares per item:** Must equal 1.0 (within 0.0001 tolerance)
- **Required receipt fields:** merchant, items[]
- **Required item fields:** name, price
- **Optional fields:** tax, tip, discounts, date, quantity

---

## Example Workflows

See [EXAMPLE_FLOW.md](./EXAMPLE_FLOW.md) for detailed step-by-step examples with real data.

### Quick Start Flow
1. Add people: `POST /api/balance/person`
2. Parse receipt: `POST /api/parser/ocr` or `POST /api/parser/manual`
3. Assign items: Multiple `POST /api/itemizer/assign` calls
4. Get assignments: `GET /api/itemizer/assignments/:receiptId`
5. Submit to balance: `POST /api/balance/receipt`
6. Calculate settlements: `GET /api/balance/settlements`

### Recommended UI Flow
1. **People Screen**: Add all participants first
2. **Receipt Entry**: OCR scan or manual entry
3. **Item Assignment**: Show items, tap to assign people with sliders/percentages
4. **Review**: Show each person's calculated share
5. **Submit**: Add to balance
6. **Repeat**: Add more receipts as needed
7. **Settlements**: View optimized payment plan

---

## TypeScript Types

For TypeScript projects, import types from the schemas:

```typescript
import type {
  Receipt,
  ReceiptItem,
  Person,
  PersonShare,
  ItemAssignment,
  Settlement,
  Balance
} from './schemas';
```

All schemas are defined in `backend/src/schemas/index.ts`.
