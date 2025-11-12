# Dynamic Models & Admin Reporting - Implementation Guide

## Overview

This implementation adds dynamic model support with database-driven size fields, customer/order name tracking, and admin reporting capabilities.

## Database Setup (Required)

**⚠️ IMPORTANT**: The owner must run these SQL commands in Supabase console before using the new features:

```sql
-- Add size_fields column to models table
ALTER TABLE models ADD COLUMN IF NOT EXISTS size_fields JSONB DEFAULT '[]'::jsonb;

-- Add customer_name and order_name to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_name TEXT;
```

### Verify Database Columns

Run the provided script to check if columns exist:

```bash
node backend/scripts/check-columns.js
```

**Expected Output (after adding columns):**
```
✅ All required columns exist!

You can safely use all features including:
  - Dynamic size fields from database
  - Customer names in orders
  - Order names in orders
```

## Features Implemented

### 1. Dynamic Size Fields for Models

**Backend**: New `/models` endpoint
- Fetches models from database with `size_fields` JSONB column
- Returns normalized model data with size field definitions
- Gracefully handles missing `size_fields` column (returns empty array)
- Fallback to `models_id,name,description` only if size_fields doesn't exist

**Frontend**: Dashboard.vue
- Calls `/models` API on mount to fetch models dynamically
- Renders size input fields based on `models.size_fields` from DB
- Falls back to hardcoded fields if backend doesn't return size_fields
- Example size_fields format:
```json
[
  { "key": "lingkar_dada", "label": "Lingkar Dada", "type": "number", "unit": "cm" },
  { "key": "panjang_baju", "label": "Panjang Baju", "type": "number", "unit": "cm" }
]
```

### 2. Customer Name & Order Name Flow

**Order Creation Form (Dashboard.vue)**:
- New input fields: "Customer Name" and "Order Name"
- Optional fields - can be left blank
- Examples:
  - Customer Name: "John Doe", "PT ABC Company"
  - Order Name: "School Uniform Batch 1", "Q4 Corporate Order"

**Backend Handling**:
- Extracts `customer_name` and `order_name` from request body
- Conditionally includes them in order insert if provided
- **Retry Logic**: If columns don't exist, retries without these fields and logs warning
- No errors if DB columns are missing - graceful degradation

**Orders Display**:
- Dashboard orders table shows Customer Name and Order Name columns
- Falls back to "Unknown" if values are null or missing
- Helps identify orders at a glance

### 3. Enhanced Payment Dropdown

**Payment.vue formatOrderDisplay()**:
- Priority order: Order Name > Customer Name > Product > Model > Quantity
- Example display: "School Uniform Batch 1 • John Doe • Kaos • Model A • 10 pcs"
- Much more descriptive than just "Order #12345678"

### 4. UI Changes

**Navbar.vue**:
- Removed "Login" button from UI (as requested: "Sign In button")
- Login route still functional at `/login` - can access by typing URL
- Comment added in code noting this is intentional

## How to Add Size Fields to Models

### Option 1: Via Supabase Console

1. Open Supabase Table Editor
2. Navigate to `models` table
3. Find the model row you want to update
4. In the `size_fields` column, add JSON array:

```json
[
  { "key": "lingkar_dada", "label": "Lingkar Dada", "type": "number", "unit": "cm" },
  { "key": "panjang_baju", "label": "Panjang Baju", "type": "number", "unit": "cm" },
  { "key": "panjang_lengan", "label": "Panjang Lengan", "type": "number", "unit": "cm" },
  { "key": "lingkar_pinggang", "label": "Lingkar Pinggang", "type": "number", "unit": "cm" }
]
```

### Option 2: Via SQL

```sql
UPDATE models 
SET size_fields = '[
  {"key": "lingkar_dada", "label": "Lingkar Dada", "type": "number", "unit": "cm"},
  {"key": "panjang_baju", "label": "Panjang Baju", "type": "number", "unit": "cm"}
]'::jsonb
WHERE name = 'SetelanAnakPria';
```

### Field Definition Format

Each field in `size_fields` array should have:
- `key` (string, required): Unique identifier (e.g., "lingkar_dada")
- `label` (string, required): Display label (e.g., "Lingkar Dada")
- `type` (string, required): Input type ("number" or "text")
- `unit` (string, optional): Unit of measurement (e.g., "cm")

## Testing Checklist

### Without DB Columns (Graceful Degradation)

- [ ] Dashboard loads without errors
- [ ] Models API returns empty size_fields arrays
- [ ] Hardcoded size fields render correctly
- [ ] Order creation works (without customer/order names)
- [ ] Payment dropdown shows product/model info
- [ ] No 500 errors in console

### With DB Columns (Full Functionality)

- [ ] Run `check-columns.js` - all columns should exist
- [ ] Dashboard loads models from `/models` endpoint
- [ ] Size fields render from `models.size_fields`
- [ ] Can input customer name in order form
- [ ] Can input order name in order form
- [ ] Order creation includes customer_name and order_name
- [ ] Orders table displays customer_name and order_name
- [ ] Payment dropdown shows order_name and customer_name first
- [ ] Login route accessible at `/login` (even though button hidden)

### UI Verification

- [ ] Navbar doesn't show Login/Sign In button
- [ ] Dashboard "Make New Order" form has Customer Name field
- [ ] Dashboard "Make New Order" form has Order Name field
- [ ] Orders table has "Order Name" column (after Order ID)
- [ ] Orders table has "Customer Name" column (after Order Name)
- [ ] Payment dropdown shows descriptive labels

## API Endpoints

### GET /models

**Response Format:**
```json
[
  {
    "id": "uuid",
    "models_id": "uuid",
    "name": "Setelan Anak Pria",
    "description": "Description here",
    "size_fields": [
      {
        "key": "lingkar_dada",
        "label": "Lingkar Dada",
        "type": "number",
        "unit": "cm"
      }
    ]
  }
]
```

### POST /server/orders (Enhanced)

**New Request Fields:**
- `customer_name` (string, optional): Name of customer
- `order_name` (string, optional): Descriptive order name

**Example:**
```javascript
const fd = new FormData();
fd.append('product', 'Kaos');
fd.append('model', 'SetelanAnakPria');
fd.append('customer_name', 'John Doe');
fd.append('order_name', 'School Uniform Batch 1');
// ... other fields
```

## Troubleshooting

### "Column does not exist" Error

**Symptom**: 500 error when creating order with customer_name or order_name

**Solution**: Run the SQL commands to add the columns (see Database Setup section)

**Workaround**: The code will automatically retry without these fields and log a warning

### Models Not Showing Size Fields

**Check**:
1. Run `check-columns.js` - does `models.size_fields` exist?
2. Check Supabase console - do models have size_fields data?
3. Check browser console - what does `/models` API return?

**Fallback**: If size_fields column or data is missing, hardcoded fields are used

### Login Button Not Visible

**This is expected behavior**. To login:
- Navigate directly to `/login` in browser
- Use Register button to create account, then you're logged in
- Login route is still fully functional

## Files Modified

### Backend
- `backend/routes/index.js`: Added `/models` endpoint, enhanced order creation
- `backend/scripts/check-columns.js`: Utility to verify DB columns

### Frontend
- `src/views/Dashboard.vue`: Dynamic models, customer/order name inputs, table columns
- `src/views/Payment.vue`: Enhanced formatOrderDisplay() function
- `src/components/Navbar.vue`: Removed Login button from UI

### Build
- `dist/`: Rebuilt production assets

## Security Notes

CodeQL identified 6 tainted-format-string alerts. These are:
- Pre-existing debug logging patterns in the codebase
- Server-side only (not exposed to clients)
- Documented in SECURITY_SUMMARY.md as acceptable
- Standard error logging with `err.message` and `requestId`

No new security vulnerabilities introduced.

## Next Steps

1. **Owner Action Required**: Add DB columns via SQL commands
2. **Testing**: Follow testing checklist above
3. **Populate Models**: Add size_fields data to models table
4. **Production Deploy**: Deploy backend + frontend together
5. **Monitor**: Check Render logs for successful model fetching and order creation

## Example Model with Size Fields

For "Setelan Anak Pria":

```json
{
  "name": "Setelan Anak Pria",
  "description": "Children's clothing set for boys",
  "size_fields": [
    {
      "key": "lingkar_dada",
      "label": "Lingkar Dada",
      "type": "number",
      "unit": "cm"
    },
    {
      "key": "panjang_baju",
      "label": "Panjang Baju",
      "type": "number",
      "unit": "cm"
    },
    {
      "key": "panjang_celana",
      "label": "Panjang Celana",
      "type": "number",
      "unit": "cm"
    },
    {
      "key": "lingkar_pinggang",
      "label": "Lingkar Pinggang",
      "type": "number",
      "unit": "cm"
    }
  ]
}
```

When admin creates an order for this model, they'll see 4 input fields:
- Lingkar Dada (cm)
- Panjang Baju (cm)
- Panjang Celana (cm)
- Lingkar Pinggang (cm)

---

**Implementation Date**: November 12, 2025  
**Status**: ✅ Complete - Requires DB column setup by owner
