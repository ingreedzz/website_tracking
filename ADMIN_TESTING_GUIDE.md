# Admin Testing Guide

## Overview

This guide explains how to create and test admin users in the website_tracking application.

## Problem Statement

The default registration flow (`POST /register`) creates all users with the `customer` role. There was no mechanism to create admin users for testing admin-only endpoints like:

- `GET /orders` - View all orders (admin only)
- `GET /users` - View all users (admin only)
- `GET /payments` - View all payments (admin only)
- `PUT /server/orders/:id/status` - Update order status (admin only)

## Solution: Admin User Creation Script

We've created a utility script that allows you to create admin users for testing purposes.

## Creating an Admin User

### Prerequisites

1. Ensure your `.env` file has the correct Supabase credentials:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-anon-key
   ```

2. Ensure you have Node.js dependencies installed:
   ```bash
   npm install
   ```

### Usage

Run the script from the project root:

```bash
node backend/scripts/create-admin.js <email> <password> <name> [phone]
```

### Examples

**Create a basic admin user:**
```bash
node backend/scripts/create-admin.js admin@test.com admin123 "Admin User"
```

**Create admin user with phone number:**
```bash
node backend/scripts/create-admin.js admin@test.com admin123 "Admin User" "+1234567890"
```

**Promote an existing customer to admin:**
```bash
# If user already exists, the script will offer to update their role
node backend/scripts/create-admin.js existing@customer.com newpassword "Admin User"
```

## What the Script Does

The script performs the following steps:

1. **Validates Configuration**: Checks that Supabase credentials are set
2. **Checks Existing User**: Determines if the email is already registered
3. **Creates or Updates User**: 
   - If user doesn't exist: Creates new user with `role='admin'` and `is_admin=true`
   - If user exists with customer role: Updates their role to admin
   - If user exists with admin role: Reports that admin already exists
4. **Verifies Creation**: Confirms the user was created/updated successfully

## Testing Admin Functionality

Once you've created an admin user, you can test admin-only features:

### 1. Login as Admin

```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "admin123"
  }'
```

Save the returned JWT token for subsequent requests.

### 2. Test Admin Endpoints

**View All Orders:**
```bash
curl -X GET http://localhost:3000/api/orders \
  -H "Authorization: Bearer <your-jwt-token>"
```

**View All Users:**
```bash
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer <your-jwt-token>"
```

**View All Payments:**
```bash
curl -X GET http://localhost:3000/api/payments \
  -H "Authorization: Bearer <your-jwt-token>"
```

**Update Order Status:**
```bash
curl -X PUT http://localhost:3000/api/server/orders/<order-id>/status \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed"
  }'
```

### 3. Access Admin Dashboard

Navigate to the admin dashboard in your browser:

```
http://localhost:3000/admin-dashboard
```

You should be able to:
- View all customer orders
- See customer names instead of UUIDs
- View payment information with product details
- Update order statuses

## Verifying Admin Access

### Check User Role in Database

You can verify a user's role by querying the database directly via Supabase dashboard:

```sql
SELECT users_id, email, name, role, is_admin, created_at 
FROM users 
WHERE email = 'admin@test.com';
```

Expected result:
- `role`: 'admin'
- `is_admin`: true

### Check JWT Token

You can decode the JWT token to verify it contains the admin role:

```javascript
// In browser console or Node.js
const jwt = require('jsonwebtoken');
const token = 'your-jwt-token';
const decoded = jwt.decode(token);
console.log(decoded);
// Should show: { users_id: '...', email: '...', role: 'admin', ... }
```

## Troubleshooting

### "Supabase configuration missing"

**Problem**: Environment variables are not set correctly.

**Solution**: 
1. Check your `.env` file in the project root
2. Ensure `SUPABASE_URL` and `SUPABASE_KEY` are set
3. Restart your terminal/server after changing `.env`

### "Email already registered"

**Problem**: Trying to create a user that already exists.

**Solution**: The script will automatically offer to update the existing user's role to admin. Just confirm the action.

### "Failed to create user - no data returned"

**Problem**: Database table doesn't exist or API key lacks permissions.

**Solution**:
1. Run the database schema: `backend/database/schema.sql`
2. Verify your Supabase API key has write permissions
3. Check Supabase dashboard for any errors

### "Access denied" when testing endpoints

**Problem**: User role is not being recognized.

**Solution**:
1. Verify user role in database (see "Verifying Admin Access")
2. Ensure JWT token was generated after role update
3. Login again to get fresh token with admin role

## Security Considerations

### Production Use

**⚠️ WARNING**: This script is intended for development and testing only.

For production:

1. **Do not** commit real admin credentials to the repository
2. **Do not** use simple passwords like "admin123"
3. **Do** use strong, unique passwords
4. **Do** consider implementing:
   - Multi-factor authentication for admin accounts
   - Admin invitation system instead of script-based creation
   - Role-based access control (RBAC) with granular permissions
   - Admin action audit logging

### Environment Protection

- Keep admin credentials in a secure password manager
- Use different admin accounts for different team members
- Rotate admin passwords regularly
- Monitor admin actions in production logs

## Related Documentation

- [PROGRESS.md](../PROGRESS.md) - Project progress and feature history
- [AGENTS.md](../AGENTS.md) - Development workflow and conventions
- [technical_overview.md](../technical_overview.md) - System architecture

## Quick Reference

```bash
# Create admin user
node backend/scripts/create-admin.js admin@test.com admin123 "Admin User"

# Login
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}'

# Test admin endpoint
curl -X GET http://localhost:3000/api/orders \
  -H "Authorization: Bearer <token>"
```

---

**Last Updated**: November 11, 2025  
**Created by**: AI Agent (GitHub Copilot)
