# Implementation Testing Guide
## Model Management & Payment Status Updates

This guide provides step-by-step instructions for testing the implementation of features from the three prompt files.

---

## 🎯 Overview

This implementation addresses three key prompt files:
1. `CODING_AGENT_PROMPT_payments_and_status_changes.md` - Payment validations
2. `CODING_AGENT_PROMPT_manage_model_ui_dropdown.md` - Model management UI
3. `CODING_AGENT_PROMPT_pricing_and_manage_models.md` - Server-side pricing

**Changes Made:** Only 2 files modified with 19 lines changed
- All major features were already implemented
- This PR adds missing payment validations and fixes one message

---

## ✅ Prerequisites

Before testing, ensure:

- [ ] Backend deployed to Render with latest changes
- [ ] Frontend deployed to Vercel with latest changes
- [ ] Database migration for `unit_price` column applied (see `backend/database/migrations/`)
- [ ] You have test accounts (regular user and admin if needed)
- [ ] Browser console open (F12) for debug logs
- [ ] Render logs accessible for backend debug output

---

## 📋 Testing Checklist

### Part 1: Payment Validations (NEW CHANGES)

#### Test 1.1: Block Payment for Already-Paid Orders

**Scenario:** Try to pay an order that's already been paid

**Steps:**
1. Login as a user
2. Go to Dashboard → Create an order
3. Go to Payment page → Select the order → Upload payment proof
4. Wait for success message: "Payment uploaded successfully. Payment status updated to completed."
5. Try to pay the same order again

**Expected Results:**
- ✅ Button should be disabled (grayed out)
- ✅ Order dropdown should show "✓ PAID" next to the order
- ✅ If you somehow bypass frontend checks and POST again, backend returns 409 error

**Backend Logs to Check (Render):**
```
[REQ:xxx] [PAYMENT] STEP 2.5: VALIDATING ORDER IS PAYABLE
[REQ:xxx] [PAYMENT] ❌ ERROR: Payment already completed
```

**Debug Commands (curl):**
```bash
# Get auth token first (from login response or browser localStorage)
TOKEN="your_jwt_token_here"

# Try to pay already-paid order
curl -X POST "https://website-tracking.onrender.com/api/server/orders/<order_id>/payment" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@payment_proof.jpg"

# Expected response:
# {"error":"Payment already completed"}
# Status: 409
```

---

#### Test 1.2: Block Payment for Incomplete Orders

**Scenario:** Try to pay an order without proper total/price

**Note:** This is difficult to test without direct DB manipulation, as normal order creation should always include a total.

**Expected Behavior:**
- If an order somehow has `total = 0` or `null`, payment attempt returns 400 error
- Error message: "Order incomplete — missing price or product information"

**Backend Logs to Check:**
```
[REQ:xxx] [PAYMENT] STEP 2.5: VALIDATING ORDER IS PAYABLE
[REQ:xxx] [PAYMENT] ❌ ERROR: Order incomplete - missing price
```

---

#### Test 1.3: Verify Success Message

**Scenario:** Upload payment and check the alert message

**Steps:**
1. Login as a user
2. Create a new order
3. Go to Payment page
4. Select the order from dropdown
5. Upload payment proof image
6. Click "Upload Payment" button

**Expected Results:**
- ✅ Alert message says: **"Payment uploaded successfully. Payment status updated to completed."**
- ✅ NOT: "Order status updated to completed"
- ✅ Order now shows "⏳ Pending" in dropdown (proof uploaded, awaiting confirmation)

**Browser Console Logs:**
```
[PAYMENT] === Starting payment proof upload ===
[PAYMENT] Preparing form data...
[PAYMENT] Sending POST /server/orders/:id/payment...
[PAYMENT] Response status: 201
[PAYMENT] Upload successful: {...}
[PAYMENT] === Payment proof upload complete ===
```

---

### Part 2: Model Management UI (ALREADY IMPLEMENTED - VERIFY)

#### Test 2.1: View All Models

**Steps:**
1. Login as any user
2. Go to Dashboard
3. Click "Manage Models" button

**Expected Results:**
- ✅ List of all models displayed
- ✅ Each model shows:
  - Model name
  - Description (if set)
  - Unit Price (if set) in format: "Rp 28,000"
  - Size Fields (comma-separated list)
- ✅ Each model has "Edit" and "Delete" buttons

---

#### Test 2.2: Edit Model

**Steps:**
1. In Manage Models view, click "Edit" on a model
2. Change the model name (e.g., add "v2" to the end)
3. Change the unit price (e.g., increase by 1000)
4. Click "Save"

**Expected Results:**
- ✅ Success alert: "Model updated successfully!"
- ✅ Model list refreshes automatically
- ✅ Changes are visible immediately
- ✅ Going to "Create Order" shows updated model name in dropdown
- ✅ Creating new order uses updated unit_price

**Backend Logs (Render):**
```
[REQ:xxx] [MODELS-UPDATE] === Updating model ===
[REQ:xxx] [MODELS-UPDATE] Step 1: Extracting request data
[REQ:xxx] [MODELS-UPDATE] Step 2: Preparing update object
[REQ:xxx] [MODELS-UPDATE] Step 3: Updating in database
[REQ:xxx] [MODELS-UPDATE] ✓ Model updated successfully
```

---

#### Test 2.3: Delete Model (Without Orders)

**Steps:**
1. Create a new test model (Dashboard → "Create Model")
2. Name it "Test Model DELETE ME"
3. Don't create any orders using this model
4. Go to Manage Models
5. Click "Delete" on the test model
6. Confirm the deletion

**Expected Results:**
- ✅ Confirmation dialog appears with warning message
- ✅ After confirming, success message appears
- ✅ Model is removed from the list
- ✅ Model no longer appears in "Create Order" dropdown

**Backend Logs:**
```
[REQ:xxx] [MODELS-DELETE] === Deleting model ===
[REQ:xxx] [MODELS-DELETE] Step 1: Checking if model exists
[REQ:xxx] [MODELS-DELETE] ✓ Model found: Test Model DELETE ME
[REQ:xxx] [MODELS-DELETE] Step 2: Deleting model from database
[REQ:xxx] [MODELS-DELETE] ✓ Model deleted successfully
```

---

#### Test 2.4: Delete Model (With Orders) - FK Constraint

**Steps:**
1. Create an order using an existing model
2. Try to delete that model from Manage Models
3. Confirm the deletion

**Expected Results:**
- ✅ Confirmation dialog appears
- ✅ After confirming, error alert appears:
  - "Cannot delete model that is referenced by existing orders."
  - "Consider archiving instead."
- ✅ Model is NOT deleted
- ✅ Model still appears in the list

**Backend Logs:**
```
[REQ:xxx] [MODELS-DELETE] === Deleting model ===
[REQ:xxx] [MODELS-DELETE] ❌ Cannot delete: Model is referenced by existing orders
```

---

### Part 3: Server-Side Pricing (ALREADY IMPLEMENTED - VERIFY)

#### Test 3.1: Create Model with Unit Price

**Steps:**
1. Dashboard → "Create Model"
2. Fill in:
   - Name: "Test Product with Price"
   - Description: "Testing unit price feature"
   - Unit Price: 35000
   - Add size fields (optional)
3. Click "Create Model"

**Expected Results:**
- ✅ Success message with green background
- ✅ Model appears in Manage Models with "Unit Price: Rp 35,000"
- ✅ Model available in Create Order dropdown

**Backend Logs:**
```
[REQ:xxx] [MODELS-CREATE] === Creating new model ===
[REQ:xxx] [MODELS-CREATE] Step 1: Extracting request data
[REQ:xxx] [MODELS-CREATE] Input data: {..., unit_price: 35000}
[REQ:xxx] [MODELS-CREATE] ✓ Model created successfully
```

---

#### Test 3.2: Create Order with Auto Price Calculation

**Steps:**
1. Dashboard → "Make New Order"
2. Select model: "Test Product with Price" (from above)
3. Fill in quantity: 5
4. Fill in other required fields
5. Upload sablon image
6. Submit order

**Expected Results:**
- ✅ Order created successfully
- ✅ Check backend logs: total calculated as `unit_price * quantity`
- ✅ In this case: 35,000 × 5 = 175,000
- ✅ Order in dashboard shows total: Rp 175,000

**Backend Logs:**
```
[REQ:xxx] [ORDER] STEP 2.5: DETERMINING UNIT PRICE
[REQ:xxx] [ORDER] Attempting to fetch unit_price from models table for: Test Product with Price
[REQ:xxx] [ORDER] ✓ Found unit_price in models table: 35000
[REQ:xxx] [ORDER] Quantity: 5
[REQ:xxx] [ORDER] Calculated total (unit_price * quantity): 175000
[REQ:xxx] [ORDER] Final values:
[REQ:xxx] [ORDER]   final unit_price: 35000
[REQ:xxx] [ORDER]   final total_price: 175000
```

---

#### Test 3.3: Price Override Protection

**Scenario:** Verify server overrides client-provided total if it differs

**Note:** This requires modifying the frontend code temporarily or using curl to send a different total.

**Debug Command (curl):**
```bash
TOKEN="your_jwt_token_here"

# Create order with incorrect total (should be 175000, sending 100000)
curl -X POST "https://website-tracking.onrender.com/api/server/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -F "product=Test Product" \
  -F "model=Test Product with Price" \
  -F "quantity=5" \
  -F "total_price=100000" \
  -F "file=@sablon.png"

# Check backend logs - should show warning:
# ⚠️ Client total (100000) differs from calculated (175000), using calculated
```

**Expected Results:**
- ✅ Server logs show warning about different totals
- ✅ Order is created with calculated total (175,000), not client total
- ✅ Order in dashboard shows correct total

---

## 🔍 Debugging Tips

### Browser Console (F12)

**Payment Page:**
- Look for `[PAYMENT]` logs
- Should show step-by-step upload process
- Any errors will show with `❌` symbol

**Dashboard (Orders List):**
- Look for `[Dashboard]` logs
- Shows order loading and model loading

**Model Management:**
- Look for `[Dashboard]` logs for edit/delete operations
- Shows API requests and responses

### Render Backend Logs

**Filter by Request ID:**
```
[REQ:abc123] logs
```
All logs for a single request have the same ID, making it easy to trace.

**Key Log Patterns:**
- `[PAYMENT]` - Payment operations
- `[MODELS-CREATE]` - Model creation
- `[MODELS-UPDATE]` - Model editing
- `[MODELS-DELETE]` - Model deletion
- `[ORDER]` - Order creation with pricing

**Look for:**
- ✓ - Success indicators
- ❌ - Error indicators
- ⚠️ - Warning indicators

---

## 🐛 Common Issues & Solutions

### Issue 1: Payment button stays enabled for paid order

**Cause:** Frontend state not refreshing after payment
**Solution:** Refresh the page or reload orders list
**Fix:** Check browser console for errors in `loadOrders()`

### Issue 2: Model changes don't appear immediately

**Cause:** Frontend cache or API delay
**Solution:** 
1. Check browser console for error messages
2. Go to "Show Orders" then back to "Manage Models"
3. Refresh the page

### Issue 3: Can't delete any models

**Cause:** All models are referenced by orders
**Solution:** Create a new test model that has no orders
**Expected:** Only unused models can be deleted (by design)

### Issue 4: Price calculation seems wrong

**Check:**
1. Backend logs show the calculation
2. Model actually has unit_price set (Manage Models → check the model)
3. Quantity is correct (check request body in logs)

---

## ✨ Success Criteria

You can consider the implementation successful if:

### Payment Validations
- [x] Already-paid orders cannot be paid again (409 error)
- [x] Incomplete orders cannot be paid (400 error)
- [x] Success message mentions "Payment status" not "Order status"
- [x] Button says "Upload Payment"

### Model Management
- [x] Can view all models with details
- [x] Can edit model (name, description, unit_price, size_fields)
- [x] Can delete unused models
- [x] Cannot delete models with orders (FK constraint)
- [x] Changes reflect immediately in UI

### Server-Side Pricing
- [x] Models can have unit_price
- [x] Order creation looks up model unit_price automatically
- [x] Total calculated as unit_price × quantity server-side
- [x] Client-provided total is overridden if different
- [x] All calculations logged for debugging

---

## 📊 Summary

**Total Changes:** 2 files, 19 lines
**Testing Time:** ~30 minutes for all tests
**Deployment Required:** Backend + Frontend

**Most Important Tests:**
1. Test 1.3: Verify success message ⭐
2. Test 2.2: Edit model ⭐
3. Test 3.2: Create order with auto pricing ⭐

All other features were already implemented and just need verification.

---

## 🚀 Next Steps After Testing

1. ✅ Verify all tests pass
2. ✅ Check backend logs show proper debugging output
3. ✅ Confirm no errors in browser console
4. ✅ Merge PR if all tests successful
5. ✅ Deploy to production
6. ✅ Monitor Render logs for any issues

---

**Questions or Issues?**
Check backend logs first - they have comprehensive step-by-step debugging output with clear ✓/❌/⚠️ indicators.
