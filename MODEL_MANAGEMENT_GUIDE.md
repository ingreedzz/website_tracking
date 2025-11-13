# Model Management Guide

## Overview

This guide explains how to use the enhanced Model Management UI to create models with dynamic size fields, and how those models integrate with the order creation system.

## Features

### 1. User-Friendly Model Creation Interface

The admin dashboard now includes an intuitive model creation interface that doesn't require JSON knowledge.

#### Key Features:
- **Visual Field Builder**: Add/remove size fields with buttons
- **Individual Field Controls**: Separate inputs for key, label, type, and unit
- **Real-time Validation**: Automatic filtering of incomplete fields
- **Help Text**: Examples and guidance built into the UI
- **Success Feedback**: Clear messages showing what was created

### 2. Dynamic Size Fields

Models can have custom size fields that automatically appear in the order creation form.

#### Field Properties:
- **Key**: Internal identifier (e.g., `lingkar_dada`)
- **Label**: Display name (e.g., `Lingkar Dada`)
- **Type**: `number` or `text`
- **Unit**: Measurement unit (e.g., `cm`, `inch`)

### 3. Database Integration

All models are stored in Supabase and loaded dynamically:
- Models fetched from `/api/models` endpoint
- Size fields stored as JSONB array in database
- Automatic fallback to hardcoded models if needed

## How to Use

### Creating a New Model

1. **Login as Admin**
   - Navigate to `/admin-dashboard`
   - Ensure you have admin privileges

2. **Open Model Creation Form**
   - Click the green "Create Model" button
   - The creation form will expand

3. **Enter Basic Information**
   ```
   Model Name: Kaos Oblong Dewasa
   Description: Adult t-shirt with custom sizing
   ```

4. **Add Size Fields**
   
   Click "+ Add Field" for each measurement:

   **Field 1:**
   ```
   Field Key: lingkar_dada
   Field Label: Lingkar Dada
   Type: number
   Unit: cm
   ```

   **Field 2:**
   ```
   Field Key: panjang_baju
   Field Label: Panjang Baju
   Type: number
   Unit: cm
   ```

   **Field 3:**
   ```
   Field Key: panjang_lengan
   Field Label: Panjang Lengan
   Type: number
   Unit: cm
   ```

5. **Submit**
   - Click "Create Model" button
   - Success message will show: "Model 'Kaos Oblong Dewasa' created successfully with 3 size fields!"
   - Form will auto-close after 2 seconds

6. **Remove Fields (if needed)**
   - Click "Remove" button next to any field to delete it

### Using Models in Order Creation

1. **Navigate to Dashboard**
   - Go to `/dashboard`
   - Click "Make New Order" button

2. **Select Model**
   - Choose your model from the "Model" dropdown
   - The dropdown shows all models from the database
   - Dynamic size fields appear automatically

3. **Fill Dynamic Size Fields**
   - Size fields from the model appear below the model selector
   - Each field shows: Label, input box, and unit
   - Example: "Lingkar Dada (cm)" with number input

4. **Complete Order**
   - Fill in customer name and order name
   - Add product details, color, address, etc.
   - Upload sablon image
   - Submit order

## Database Schema

### Models Table

```sql
CREATE TABLE public.models (
  models_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  description text,
  size_fields jsonb DEFAULT '[]'::jsonb
);
```

### Size Fields Format

```json
[
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
  }
]
```

## API Endpoints

### GET /api/models

Fetches all models with their size fields.

**Response:**
```json
[
  {
    "id": "uuid",
    "models_id": "uuid",
    "name": "Kaos Oblong Dewasa",
    "description": "Adult t-shirt",
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

### POST /api/models

Creates a new model (admin only).

**Request:**
```json
{
  "name": "Kaos Oblong Dewasa",
  "description": "Adult t-shirt with custom sizing",
  "size_fields": [
    {
      "key": "lingkar_dada",
      "label": "Lingkar Dada",
      "type": "number",
      "unit": "cm"
    }
  ]
}
```

**Response:**
```json
{
  "models_id": "uuid",
  "name": "Kaos Oblong Dewasa",
  "description": "Adult t-shirt with custom sizing",
  "size_fields": [...]
}
```

## Examples

### Example 1: Children's Clothing

```
Model Name: Setelan Anak Pria
Description: Boy's clothing set

Size Fields:
1. Key: lingkar_dada, Label: Chest Circumference, Type: number, Unit: cm
2. Key: panjang_baju, Label: Shirt Length, Type: number, Unit: cm
3. Key: panjang_celana, Label: Pants Length, Type: number, Unit: cm
4. Key: lingkar_pinggang, Label: Waist Circumference, Type: number, Unit: cm
```

### Example 2: Sports Uniform

```
Model Name: Seragam Olahraga
Description: Sports uniform set

Size Fields:
1. Key: lingkar_dada, Label: Chest Circumference, Type: number, Unit: cm
2. Key: panjang_baju, Label: Shirt Length, Type: number, Unit: cm
3. Key: panjang_celana, Label: Pants Length, Type: number, Unit: cm
```

### Example 3: Hoodie/Jacket

```
Model Name: Jaket Hoodie
Description: Hoodie jacket with custom size

Size Fields:
1. Key: lingkar_dada, Label: Chest Circumference, Type: number, Unit: cm
2. Key: panjang_baju, Label: Jacket Length, Type: number, Unit: cm
3. Key: panjang_lengan, Label: Sleeve Length, Type: number, Unit: cm
4. Key: ukuran_hoodie, Label: Hood Size, Type: text, Unit: (none)
```

## Customer & Order Names Feature

### Order Creation Includes:

**Customer Name Field:**
- Stores the name of the customer placing the order
- Example: "John Doe", "PT Maju Jaya"
- Displayed in admin dashboard and order tables

**Order Name Field:**
- Descriptive name for the order batch
- Example: "School Uniform Batch 1", "Corporate Event Shirts"
- Helps identify orders quickly without looking at UUIDs

### Database Schema:

```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_name TEXT;
```

### Display in Orders Table:

```
| Order ID | Order Name              | Customer Name | Product | ... |
|----------|-------------------------|---------------|---------|-----|
| 12345... | School Uniform Batch 1  | John Doe      | Kaos    | ... |
| 67890... | Corporate Event Shirts  | PT Maju Jaya  | Polo    | ... |
```

## Troubleshooting

### Problem: Models don't appear in dropdown

**Solution:**
1. Check browser console for errors
2. Verify `/api/models` endpoint returns data
3. Check Supabase database has models
4. Ensure `size_fields` column exists in models table

### Problem: Size fields don't render

**Solution:**
1. Check that model has `size_fields` array in database
2. Verify array format matches expected structure
3. Check browser console for parsing errors
4. Ensure each field has `key`, `label`, and `type` properties

### Problem: Model creation fails

**Solution:**
1. Ensure you're logged in as admin
2. Check model name is unique
3. Verify all fields have key and label
4. Check backend logs for detailed error messages

### Problem: Customer/Order names not saving

**Solution:**
1. Verify columns exist in orders table:
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'orders' 
   AND column_name IN ('customer_name', 'order_name');
   ```
2. Run SQL to add columns if missing (see Database Schema above)
3. Check backend logs for insert errors
4. Verify frontend sends these fields in FormData

## Testing Checklist

### Model Management
- [ ] Open admin dashboard
- [ ] Click "Create Model" button
- [ ] Fill in model name and description
- [ ] Add at least 2 size fields
- [ ] Click "Create Model"
- [ ] Verify success message appears
- [ ] Check model appears in database

### Order Creation
- [ ] Navigate to regular dashboard
- [ ] Click "Make New Order"
- [ ] Select newly created model from dropdown
- [ ] Verify dynamic size fields appear
- [ ] Fill in customer name
- [ ] Fill in order name
- [ ] Fill in all size fields
- [ ] Complete order form
- [ ] Submit order
- [ ] Verify order saved with correct data

### Data Verification
- [ ] Check orders table shows customer name
- [ ] Check orders table shows order name
- [ ] Verify size field values stored correctly
- [ ] Confirm no "Unknown" or null values
- [ ] Test order detail view shows all data

## Best Practices

1. **Model Names**: Use clear, descriptive names that identify the product type
2. **Field Keys**: Use lowercase with underscores (e.g., `lingkar_dada`)
3. **Field Labels**: Use proper capitalization and readable format (e.g., `Lingkar Dada`)
4. **Units**: Always specify units for numeric fields (cm, inch, kg, etc.)
5. **Field Order**: Add fields in logical order (top to bottom, general to specific)
6. **Testing**: Always test model creation → order creation flow before production use

## Support

For issues or questions:
1. Check browser console for errors
2. Review backend logs in Render
3. Verify database schema in Supabase
4. Consult PROGRESS.md for recent changes
5. Review technical_overview.md for architecture details

---

**Last Updated**: November 13, 2025
**Version**: 1.0.0
