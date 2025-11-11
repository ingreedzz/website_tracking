# Debug Guide: Order Creation 500 Error

## Overview
This guide explains how to use the enhanced debug logging to identify and fix the 500 error occurring during order submission.

## What Was Changed

### Enhanced Logging
The order creation endpoint (`POST /api/server/orders`) now logs every step of the process:

1. **Step 1: Authentication** - Validates user token and extracts user ID
2. **Step 2: Validation** - Checks required fields (product, model, file)
3. **Step 3: File Upload** - Uploads sablon image to Supabase Storage
4. **Step 4: Order Creation** - Inserts order record into database
5. **Step 5: Address** - Inserts order address (optional)
6. **Step 5.5: Custom Parsing** - Parses custom measurements JSON
7. **Step 6: Order Item** - Inserts order item with product details
8. **Step 7: Public URL** - Generates public URL for uploaded image

### Error Messages
Replaced generic `{"error":"Server error"}` with specific messages:
```json
{
  "error": "Failed to upload file",
  "details": "Bucket 'sablon-images' does not exist"
}
```

## How to Debug

### 1. Deploy to Render
```bash
git push origin copilot/fix-server-error-on-order-submit
```
This will trigger a new deployment on Render with the enhanced logging.

### 2. Reproduce the Error
1. Go to your website: https://website-tracking-ruddy.vercel.app
2. Log in as a customer
3. Navigate to Dashboard
4. Click "Make New Order"
5. Fill in all fields and select an image
6. Click "Next / Submit"
7. Wait for the 500 error

### 3. Check Render Logs
1. Go to Render Dashboard: https://dashboard.render.com
2. Select your backend service
3. Click on "Logs" tab
4. Look for lines starting with `[ORDER]`

### 4. Identify the Failure Point
The logs will show which step failed. Example:

```
[ORDER] === New order creation request ===
[ORDER] Timestamp: 2025-11-11T14:30:00.000Z
[ORDER] Step 1: Validating authentication...
[ORDER] ✓ Authentication validated
[ORDER] Step 2: Validating request body...
[ORDER] ✓ Validation passed
[ORDER] Step 3: Uploading file to Supabase Storage...
[ORDER] ERROR: Storage upload failed
[ORDER] Storage error: {
  "message": "The resource already exists",
  "statusCode": 409
}
```

In this example, the error occurs at Step 3 (file upload).

## Common Issues and Solutions

### Issue 1: Supabase Client Not Initialized
**Log Pattern:**
```
[ORDER] ERROR: Supabase client not initialized!
[ORDER] Environment variables: { hasSupabaseUrl: false, hasSupabaseKey: false }
```

**Solution:**
1. Go to Render Dashboard → Your Service → Environment
2. Add these environment variables:
   - `SUPABASE_URL` or `VITE_SUPABASE_URL`
   - `SUPABASE_KEY` or `VITE_SUPABASE_ANON_KEY`
   - `JWT_SECRET`
   - `SUPABASE_UPLOAD_BUCKET` (default: "sablon-images")
3. Redeploy the service

### Issue 2: Storage Bucket Not Found
**Log Pattern:**
```
[ORDER] Storage error: { "message": "Bucket not found", "statusCode": 404 }
```

**Solution:**
1. Go to Supabase Dashboard → Storage
2. Create a new bucket named "sablon-images"
3. Set bucket visibility to "Public" or configure RLS policies
4. Try again

### Issue 3: Storage Permission Denied
**Log Pattern:**
```
[ORDER] Storage error: { "message": "new row violates row-level security policy", "statusCode": 403 }
```

**Solution:**
1. Go to Supabase Dashboard → Storage → sablon-images → Policies
2. Add a policy to allow inserts:
   ```sql
   CREATE POLICY "Allow authenticated uploads"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'sablon-images');
   ```
3. Or make the bucket public (less secure)

### Issue 4: Database Insert Failed
**Log Pattern:**
```
[ORDER] ERROR: Insert order failed
[ORDER] Error details: {
  "message": "null value in column \"user_id\" violates not-null constraint",
  "code": "23502"
}
```

**Solution:**
1. Check that `user_id` field is being extracted correctly
2. Verify JWT token contains `users_id` field
3. Check database schema allows NULL for user_id (or fix extraction logic)

### Issue 5: JSON Parse Error (Custom Field)
**Log Pattern:**
```
[ORDER] ERROR: Failed to parse custom field
[ORDER] Custom value: {invalid json}
[ORDER] Parse error: Unexpected token ...
```

**Solution:**
This is now handled automatically - it will use an empty object `{}` if parsing fails. Check frontend is sending valid JSON.

## Understanding the Logs

### Success Pattern
When everything works, you'll see:
```
[ORDER] === New order creation request ===
[ORDER] Step 1: Validating authentication...
[ORDER] ✓ Authentication validated
[ORDER] Step 2: Validating request body...
[ORDER] ✓ Validation passed
[ORDER] Step 3: Uploading file to Supabase Storage...
[ORDER] ✓ File uploaded successfully
[ORDER] Step 4: Creating order in database...
[ORDER] ✓ Order created successfully
[ORDER] Step 5: Inserting order address...
[ORDER] ✓ Address inserted successfully
[ORDER] Step 6: Creating order item...
[ORDER] ✓ Order item created successfully
[ORDER] Step 7: Getting public URL...
[ORDER] ✓ Public URL: https://...
[ORDER] === Order creation successful ===
```

### Error Pattern
When something fails, you'll see:
```
[ORDER] === New order creation request ===
[ORDER] Step 1: Validating authentication...
[ORDER] ✓ Authentication validated
[ORDER] Step 2: Validating request body...
[ORDER] ✓ Validation passed
[ORDER] Step 3: Uploading file to Supabase Storage...
[ORDER] ERROR: Storage upload failed
[ORDER] Storage error: {...detailed error...}
[ORDER] === Unexpected error in order creation ===
```

The last successful step tells you what worked, and the first ERROR tells you what failed.

## Testing After Fix

1. Make the necessary changes based on the logs
2. Redeploy to Render
3. Try submitting an order again
4. Check the logs to see if it progresses further
5. Repeat until all steps show ✓

## Need More Help?

If the logs don't clearly show the issue:

1. **Check the full error object** - Look for the `[ORDER] Full error object:` line
2. **Check environment variables** - Verify all are set correctly on Render
3. **Check Supabase dashboard** - Verify tables exist and have correct schema
4. **Check network** - Ensure Render can reach Supabase
5. **Check the response** - The error response now includes a `details` field with more info

## Example Debug Session

**Problem:** Order creation returns 500 error

**Step 1:** Check Render logs
```
[ORDER] ERROR: Supabase client not initialized!
```

**Step 2:** Go to Render environment variables
- Found: `SUPABASE_URL` is missing
- Action: Added `SUPABASE_URL` from Supabase dashboard

**Step 3:** Redeploy and test
```
[ORDER] ✓ Authentication validated
[ORDER] ERROR: Storage upload failed
[ORDER] Storage error: { "message": "Bucket not found" }
```

**Step 4:** Go to Supabase Storage
- Found: No bucket named "sablon-images"
- Action: Created bucket with public access

**Step 5:** Test again
```
[ORDER] === Order creation successful ===
```

**Result:** Issue fixed! Orders now work correctly.

---

*This guide was created to help debug the 500 error on order submission. The enhanced logging makes it much easier to identify exactly where and why the error occurs.*
