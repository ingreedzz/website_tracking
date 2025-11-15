# System Documentation Guide

## Quick Reference

This repository now contains **SYSTEM_ANALYSIS_DESIGN.md** - a comprehensive 852-line documentation file containing ALL necessary information to create:

### 📊 Diagrams You Can Create

1. **Use Case Diagram**
   - 8 documented use cases
   - 2 actors (Customer, Admin)
   - Complete with preconditions and postconditions
   - See Section 4

2. **Use Case Scenarios**
   - Detailed step-by-step scenarios
   - Registration flow
   - Order creation flow
   - Payment upload flow
   - Admin order processing
   - See Section 4.2

3. **Activity Diagram**
   - Order creation activity (with decision points)
   - Payment upload activity (with validation flows)
   - Error handling paths
   - See Section 5

4. **Sequence Diagram**
   - User registration sequence
   - Order creation sequence
   - Order status update sequence
   - Complete with all participants and messages
   - See Section 6

5. **Class Diagram**
   - 7 main classes documented
   - Attributes and methods for each class
   - Relationships (1:N, N:1)
   - See Section 7

6. **ERD - Conceptual**
   - 7 entities
   - All relationships with cardinality
   - See Section 8.1

7. **ERD - Logical**
   - Complete table structures
   - All columns with data types
   - Primary and foreign keys
   - See Section 8.2

8. **Table Specifications**
   - All 7 database tables fully documented
   - Column specifications
   - Constraints (PK, FK, unique, check, default)
   - JSONB structures
   - Foreign key relationships
   - See Section 9

### 📁 Document Structure

```
SYSTEM_ANALYSIS_DESIGN.md
├── 1. System Overview
├── 2. User Roles and Permissions
├── 3. User Flow Documentation (10+ flows)
├── 4. Use Case Documentation (8 use cases)
├── 5. Activity Diagrams Information
├── 6. Sequence Diagrams Information
├── 7. Class Diagram Information (7 classes)
├── 8. Entity Relationship Diagram (ERD)
├── 9. Database Table Specifications (7 tables)
├── 10. Business Rules
└── 11. API Endpoints Summary
```

### 🗃️ Database Tables Documented

1. **users** - User accounts with authentication
2. **models** - Product models with dynamic size fields (JSONB)
3. **orders** - Main order records
4. **order_items** - Order line items with product snapshots
5. **order_addresses** - Delivery addresses
6. **payments** - Payment proof records
7. **order_status_history** - Complete audit trail

### 🔑 Key Features Documented

- **10+ User Flows** - Complete user journeys from registration to order completion
- **Permission Matrix** - Customer vs Admin access rights
- **Status Transitions** - Valid order status changes with rules
- **JSONB Structures** - Documented for size_fields, product_snapshot, customization
- **API Endpoints** - Complete REST API reference
- **Business Rules** - Payment rules, model management, access control

### 🎯 How to Use This Documentation

**For Use Case Diagrams:**
- Read Section 4.1 for actors and use cases
- Use the permission matrix in Section 2.2
- Reference use case scenarios in Section 4.2

**For Activity Diagrams:**
- Section 5 provides complete activity flows
- Includes decision points and error paths
- Two main activities fully documented

**For Sequence Diagrams:**
- Section 6 contains 3 detailed sequences
- Lists all participants (User, Browser, Frontend, Backend, Database)
- Shows all messages and interactions

**For Class Diagrams:**
- Section 7 documents 7 classes
- Includes attributes, methods, and relationships
- Relationship summary provided

**For ERD:**
- Section 8.1 for conceptual model
- Section 8.2 for logical model with all attributes
- Section 8.3 for cardinality summary

**For Database Design:**
- Section 9 contains complete table specifications
- All columns with types and constraints
- Foreign key relationships documented
- JSONB structures explained with examples

### 📝 Based on Actual Implementation

This documentation is based on the actual running system:
- **Frontend**: Vue.js 3 + Vite
- **Backend**: Node.js + Express
- **Database**: PostgreSQL (Supabase)
- **Storage**: Supabase Storage
- **Auth**: JWT tokens

All flows, use cases, and database structures reflect the real implementation in the codebase.

---

**Document Version:** 1.0  
**Created:** November 15, 2025  
**Lines:** 852  
**Purpose:** Enable creation of all UML diagrams, ERD, and database specifications for thesis/documentation
