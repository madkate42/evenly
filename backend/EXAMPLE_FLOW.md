# Evenly - Example Flow

This document walks through how the complete system works with a concrete example of multiple receipts and calculating final balance.

## Example Scenario
**People:** Alice, Bob, Carol go out for 2 meals

---

## Step 1: Create Session & Add People

```http
POST /api/balance/person { displayName: "Alice" }
→ { id: "p1", displayName: "Alice" }

POST /api/balance/person { displayName: "Bob" }
→ { id: "p2", displayName: "Bob" }

POST /api/balance/person { displayName: "Carol" }
→ { id: "p3", displayName: "Carol" }
```

---

## Step 2: Add First Receipt (Dinner)

### 2a. Parse receipt

```http
POST /api/parser/ocr { ocrData: "..." }
→ {
    id: "r1",
    merchant: "Pizza Place",
    items: [
      { id: "i1", name: "Pepperoni Pizza", price: 20, quantity: 1 },
      { id: "i2", name: "Caesar Salad", price: 12, quantity: 1 },
      { id: "i3", name: "Drinks", price: 15, quantity: 3 }
    ],
    subtotal: 47,
    discounts: 0,
    tax: 4.23,
    tip: 9.40,
    total: 60.63
  }
```

### 2b. Assign items

UI shows item list, user taps to assign:

```http
POST /api/itemizer/assign
  { receiptId: "r1", itemId: "i1", personId: "p1", share: 0.5 }
POST /api/itemizer/assign
  { receiptId: "r1", itemId: "i1", personId: "p2", share: 0.5 }

POST /api/itemizer/assign
  { receiptId: "r1", itemId: "i2", personId: "p3", share: 1.0 }

POST /api/itemizer/assign
  { receiptId: "r1", itemId: "i3", personId: "p1", share: 0.33 }
POST /api/itemizer/assign
  { receiptId: "r1", itemId: "i3", personId: "p2", share: 0.33 }
POST /api/itemizer/assign
  { receiptId: "r1", itemId: "i3", personId: "p3", share: 0.34 }
```

### 2c. Submit receipt to balance

```http
POST /api/balance/receipt {
  receipt: { ...receipt from 2a... },
  assignments: [
    { personId: "p1", items: [{ itemId: "i1", share: 0.5 }, { itemId: "i3", share: 0.33 }] },
    { personId: "p2", items: [{ itemId: "i1", share: 0.5 }, { itemId: "i3", share: 0.33 }] },
    { personId: "p3", items: [{ itemId: "i2", share: 1.0 }, { itemId: "i3", share: 0.34 }] }
  ]
}
```

### Behind the scenes calculation

**Subtotals per person:**
- Alice's subtotal: (20 × 0.5) + (15 × 0.33) = 14.95
- Bob's subtotal: (20 × 0.5) + (15 × 0.33) = 14.95
- Carol's subtotal: (12 × 1.0) + (15 × 0.34) = 17.10
- Total: 47.00 ✓

**Proportional tax/tip:**
- Alice: 14.95/47 × (4.23 + 9.40) = 4.34 → **Total: $19.29**
- Bob: 14.95/47 × 13.63 = 4.34 → **Total: $19.29**
- Carol: 17.10/47 × 13.63 = 4.96 → **Total: $22.06**

---

## Step 3: Add Second Receipt (Coffee)

```http
POST /api/parser/manual {
  merchant: "Starbucks",
  items: [{ name: "Latte", price: 5, quantity: 2 }],
  ...
}
→ {
    id: "r2",
    subtotal: 10,
    tax: 0.90,
    tip: 2,
    total: 12.90
  }

// Bob bought both lattes
POST /api/itemizer/assign
  { receiptId: "r2", itemId: "i4", personId: "p2", share: 1.0 }

POST /api/balance/receipt { receipt: {...}, assignments: [...] }
```

**Bob's total for this receipt:** 10 + 0.90 + 2 = **$12.90**

---

## Step 4: Get Final Settlements

```http
GET /api/balance/settlements
→ [
    { from: "p1", to: "p2", amount: 19.29 },
    { from: "p3", to: "p2", amount: 22.06 }
  ]
```

**Interpretation:** Bob paid both receipts upfront. Alice owes Bob $19.29, Carol owes Bob $22.06.

---

## Seamless UI Flow

**For best UX:**

1. **Session-based:** Single `BalanceManager` instance per session (in-memory is fine for MVP)
2. **Progressive flow:**
   - "Add People" screen first
   - "Scan Receipt" → shows parsed items
   - "Assign Items" → drag/tap interface
   - Shows running total after each receipt
   - Final "Settle Up" screen

3. **State management consideration:**
   - Currently each route creates new component instances
   - Need single `BalanceManager` instance per session
   - Session ID to track state across multiple receipts
   - This makes API stateful but provides smoother UX
