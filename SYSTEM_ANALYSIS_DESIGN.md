# System Analysis and Design Documentation
# Website Tracking - Custom Sablon Order Management System

**Document Version:** 1.0  
**Date:** November 15, 2025  
**Purpose:** Complete system documentation for UML diagrams, ERD, and database specifications

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [User Roles and Permissions](#2-user-roles-and-permissions)
3. [User Flow Documentation](#3-user-flow-documentation)
4. [Use Case Documentation](#4-use-case-documentation)
5. [Activity Diagrams Information](#5-activity-diagrams-information)
6. [Sequence Diagrams Information](#6-sequence-diagrams-information)
7. [Class Diagram Information](#7-class-diagram-information)
8. [Entity Relationship Diagram (ERD)](#8-entity-relationship-diagram-erd)
9. [Database Table Specifications](#9-database-table-specifications)

---

## 1. System Overview

### 1.1 System Description

**Website Tracking** is a custom sablon (screen printing) order management system built with Vue.js frontend and Node.js/Express backend, using Supabase (PostgreSQL) as the database and storage solution.

### 1.2 Core Features

- **User Authentication**: JWT-based authentication with role-based access control
- **Order Management**: Create, view, update, and track custom sablon orders
- **Model Management**: Dynamic product models with customizable size fields
- **Payment Processing**: Upload payment proofs and track payment status
- **Order Status Tracking**: Complete order lifecycle management with history
- **Admin Dashboard**: Comprehensive order and user management for administrators

### 1.3 Technology Stack

- **Frontend**: Vue.js 3, Vue Router, Vite
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL (via Supabase)
- **Storage**: Supabase Storage (for images)
- **Authentication**: JWT (JSON Web Tokens)
- **Deployment**: Vercel (Frontend), Render (Backend)

---

## 2. User Roles and Permissions

### 2.1 User Roles

**This is an admin-only system.** There are no external customer users. Admins create and manage orders on behalf of customers (tracking orders entered by the admin for external clients).

#### 2.1.1 Admin
- **Identifier**: `is_admin = true`
- **Primary Functions**:
  - Create orders on behalf of customers
  - Upload payment proofs for orders (or record external payments)
  - Update order status throughout order lifecycle
  - Manage product models (create, edit, delete)
  - View complete order history and status changes
  - Access admin dashboard for order tracking and reporting
  - Delete orders as needed
  - Manage all customer information (entered by admin)

### 2.2 Permission Matrix

| Feature | Admin |
|---------|-------|
| Register/Login | ✓ |
| Create Order | ✓ |
| View All Orders | ✓ |
| Update Order Status | ✓ |
| Delete Orders | ✓ |
| Upload Payment | ✓ |
| View Payment Status | ✓ |
| Create Models | ✓ |
| Edit Models | ✓ |
| Delete Models | ✓ |
| View Order History | ✓ |
| Access Admin Dashboard | ✓ |


---

## 3. User Flow Documentation

### 3.1 Complete User Journey

**Note:** This is an admin-only system. All flows described below are performed by Admin users who create and manage orders on behalf of customers.

#### 3.1.1 Admin Registration Flow
1. Admin visits homepage
2. Clicks "Register" or navigates to `/register`
3. Fills in registration form:
   - Name
   - Email
   - Password
   - Phone (optional)
4. Submits registration
5. System validates input
6. System creates admin account (is_admin = true)
7. System generates JWT token
8. Admin is automatically logged in
9. Admin is redirected to Dashboard

#### 3.1.2 Admin Login Flow
1. Admin navigates to `/login`
2. Enters email and password
3. System validates credentials
4. System generates JWT token
5. Token stored in localStorage
6. Admin redirected to Dashboard

#### 3.1.3 Order Creation Flow (Admin)
1. Admin clicks "Make New Order" in Dashboard
2. System loads available models from database
3. Admin fills order form on behalf of customer:
   - Customer Name (the external customer's name)
   - Order Name (descriptive order title)
   - Product selection
   - Model selection (triggers dynamic size fields)
   - Custom size measurements (based on model)
   - Color selection
   - Quantity
   - Unit price (auto-filled if model has price)
   - Upload sablon design image
   - Delivery address (customer's address)
   - Phone number (customer's phone)
   - Deadline date
   - Notes (optional)
4. Admin submits order
5. System validates all fields
6. System uploads sablon image to Supabase Storage
7. System creates order record in database (linked to admin user)
8. System creates order_items record
9. System creates order_addresses record
10. System calculates total price (unit_price × quantity)
11. Success message displayed
12. Order appears in admin's order list

#### 3.1.4 View Orders Flow
1. Admin navigates to Dashboard
2. System fetches orders:
   - Admin: GET `/orders` (all orders in the system)
3. System displays orders in table with:
   - Order ID (truncated)
   - Customer Name (external customer)
   - Order Name
   - Product
   - Model/Size/Color
   - Quantity
   - Total Price
   - Order Date
   - Deadline
   - Payment Status
   - Actions (View button)

#### 3.1.5 Payment Upload Flow
1. Admin navigates to Payment page (`/payment`)
2. System loads orders
3. Admin selects order from dropdown
4. System displays order details and total
5. Admin selects payment method (Bank Transfer)
6. Admin uploads payment proof image (received from customer or recorded)
7. Admin adds payment notes (optional)
8. Admin clicks "Upload Payment"
9. System validates:
   - Order exists
   - Order not already paid
   - Order has valid total
   - File is attached
10. System uploads image to Supabase Storage
11. System creates payment record
12. System updates order payment_status to 'pending'
13. Success message displayed with proof link

#### 3.1.6 Order Status Update Flow (Admin)
1. Admin views order detail page
2. Admin selects new status from dropdown:
   - created
   - confirmed
   - printing
   - shipped
   - delivered
   - cancelled
3. Admin optionally updates payment status
4. Admin adds note (optional)
5. Admin clicks "Update Status"
6. System validates transition rules
7. System checks optimistic concurrency
8. System updates order status
9. System creates history record in order_status_history
10. System logs change with admin information
11. Success message displayed

---

## 4. Use Case Documentation

### 4.1 Use Case Diagram Elements

#### 4.1.1 Actors
1. **Admin** (Administrator - sole user actor)
2. **System** (Automated processes)

**Note:** This is an admin-only system. Admins create and manage orders on behalf of external customers.

#### 4.1.2 Main Use Cases

##### UC-001: Register Account
- **Actor**: Admin
- **Precondition**: Admin not registered
- **Postcondition**: Admin account created, JWT issued
- **Main Flow**: Registration form → Validation → Create admin account → Generate token → Login

##### UC-002: Login
- **Actor**: Admin
- **Precondition**: Admin has account
- **Postcondition**: Admin authenticated, JWT issued
- **Main Flow**: Enter credentials → Validate → Generate token → Redirect to dashboard

##### UC-003: Create Order
- **Actor**: Admin
- **Precondition**: Admin authenticated
- **Postcondition**: Order created in database on behalf of customer
- **Main Flow**: Fill form with customer details → Upload sablon image → Validate → Create order → Display confirmation

##### UC-004: View Orders
- **Actor**: Admin
- **Precondition**: Admin authenticated
- **Postcondition**: All orders displayed
- **Main Flow**: Navigate to dashboard → Fetch all orders → Display list

##### UC-005: Update Order Status
- **Actor**: Admin
- **Precondition**: Admin authenticated, order exists
- **Postcondition**: Order status updated, history recorded
- **Main Flow**: Select new status → Validate transition → Update order → Create history record

##### UC-006: Upload Payment Proof
- **Actor**: Admin
- **Precondition**: Admin authenticated, order exists, not paid
- **Postcondition**: Payment proof uploaded, status updated
- **Main Flow**: Select order → Upload payment image → Create payment record → Update order status

##### UC-007: Create Model
- **Actor**: Admin
- **Precondition**: Admin authenticated
- **Postcondition**: Model created in database
- **Main Flow**: Fill model form → Add size fields → Validate → Create model → Refresh dropdown

##### UC-008: View Order Status History
- **Actor**: Admin
- **Precondition**: Admin authenticated
- **Postcondition**: Complete status change history displayed for all orders
- **Main Flow**: Navigate to history page → Fetch records → Display with statistics

##### UC-009: Validate Order Size
- **Actor**: System
- **Precondition**: Order submission with dynamic size fields
- **Postcondition**: Size data validated against model
- **Main Flow**: Validate size fields → Check required fields → Return validation result

##### UC-010: Delete Order
- **Actor**: Admin
- **Precondition**: Admin authenticated, order exists
- **Postcondition**: Order deleted from system
- **Main Flow**: Select order → Confirm deletion → Delete order and related records


---

## 5. Activity Diagrams Information

### 5.1 Order Creation Activity

**Start**: Admin clicks "Make New Order"  
**End**: Order successfully created or error displayed

**Main Activities**:
1. Initialize Form → Load models from database
2. Admin Input (Parallel) → Fill all order fields (customer details, product specs)
3. Validation Decision → Check required fields
4. File Upload → Upload sablon image to storage
5. Calculate Price → unit_price × quantity
6. Database Transaction → Create order, items, addresses
7. Success Handling → Display message, refresh list

**Decision Points**:
- Validation valid? Yes→Continue, No→Show errors
- Upload successful? Yes→Continue, No→Show error
- Transaction successful? Yes→Success, No→Rollback

### 5.2 Payment Upload Activity

**Start**: Admin navigates to Payment page  
**End**: Payment proof uploaded or error displayed

**Main Activities**:
1. Load Orders → Fetch orders
2. Select Order → Admin chooses from dropdown
3. Eligibility Check → Validate payment allowed
4. Upload Proof → Select and upload payment image file
5. Validation → Check file type and size
6. Upload Process → Upload to storage, get URL
7. Database Update → Create payment record, update order
8. Success Display → Show confirmation with link

---

## 6. Sequence Diagrams Information

### 6.1 Admin Registration Sequence

**Participants**: Admin, Browser, Frontend (Vue), Backend (Express), Database (Supabase)

**Key Interactions**:
1. Admin → Browser: Fill registration form
2. Frontend → Backend: POST /api/register
3. Backend → Backend: Hash password (bcrypt)
4. Backend → Database: Check email exists
5. Backend → Database: INSERT new admin user
6. Backend → Backend: Generate JWT token
7. Backend → Frontend: Return {user, token}
8. Frontend → Browser: Store token, redirect to dashboard

### 6.2 Order Creation Sequence

**Participants**: Admin, Browser, Frontend, Backend, Supabase Storage, Database

**Key Interactions**:
1. Frontend → Backend: GET /api/models
2. Backend → Database: SELECT * FROM models
3. Admin → Frontend: Fill order form with customer details, upload sablon image
4. Frontend → Backend: POST /api/server/orders (multipart/form-data)
5. Backend → Supabase Storage: Upload sablon image
6. Backend → Database: BEGIN TRANSACTION
7. Backend → Database: INSERT INTO orders (with admin user_id)
8. Backend → Database: INSERT INTO order_items
9. Backend → Database: INSERT INTO order_addresses
10. Backend → Database: COMMIT TRANSACTION
11. Backend → Frontend: Return created order
12. Frontend → Browser: Display success, refresh list

### 6.3 Order Status Update Sequence (Admin)

**Participants**: Admin, Browser, Frontend, Backend, Database

**Key Interactions**:
1. Frontend → Backend: GET /api/orders/:id
2. Admin → Frontend: Select new status, add note
3. Frontend → Backend: PUT /api/server/orders/:id/status
4. Backend → Backend: Validate status transition
5. Backend → Database: BEGIN TRANSACTION
6. Backend → Database: UPDATE orders SET status=?
7. Backend → Database: INSERT INTO order_status_history
8. Backend → Database: COMMIT TRANSACTION
9. Backend → Frontend: Return success
10. Frontend → Browser: Display message, reload order

---

## 7. Class Diagram Information

### 7.1 Main Classes

#### Class: User
**Note:** In this admin-only system, all users are administrators.

**Attributes**:
- users_id: UUID (PK)
- email: String (unique)
- password: String (hashed)
- name: String
- phone: String
- is_admin: Boolean (always true for system users)
- created_at: Timestamp

**Methods**:
- register(): Boolean
- login(): Token
- logout(): void

**Relationships**:
- Has many Orders (1:N) - Admin creates orders on behalf of customers
- Changes OrderStatusHistory (1:N)

#### Class: Order
**Note:** Orders represent orders created by admin for external customers. The customer_name field stores the external customer's information.

**Attributes**:
- orders_id: UUID (PK)
- user_id: UUID (FK) - References admin who created the order
- status: String
- total: Numeric
- payment_status: String
- customer_name: String - External customer name
- order_name: String
- deadline: Date

**Methods**:
- create(): UUID
- update(): Boolean
- calculateTotal(): Numeric
- updateStatus(): Boolean

**Relationships**:
- Belongs to User (N:1) - Admin who created it
- Has many OrderItems (1:N)
- Has many Payments (1:N)
- Has many OrderStatusHistory (1:N)

#### Class: OrderItem
**Attributes**:
- items_id: UUID (PK)
- order_id: UUID (FK)
- model_id: UUID (FK)
- product_snapshot: JSONB
- quantity: Integer
- unit_price: Numeric
- customization: JSONB
- sablon_path: String

**Methods**:
- create(): UUID
- calculatePrice(): Numeric

**Relationships**:
- Belongs to Order (N:1)
- References Model (N:1)

#### Class: Model
**Attributes**:
- models_id: UUID (PK)
- name: String (unique)
- description: String
- unit_price: Numeric
- size_fields: JSONB

**Methods**:
- create(): UUID
- update(): Boolean
- delete(): Boolean

**Relationships**:
- Referenced by OrderItems (1:N)

#### Class: Payment
**Attributes**:
- payment_id: UUID (PK)
- order_id: UUID (FK)
- amount: Numeric
- method: String
- status: String
- proof_url: String

**Methods**:
- create(): UUID
- confirm(): Boolean

**Relationships**:
- Belongs to Order (N:1)

---

## 8. Entity Relationship Diagram (ERD)

### 8.1 Conceptual ERD

**Main Entities and Relationships**:

1. USER creates ORDER (1:N)
   - One user can create many orders
   - Each order belongs to one user

2. ORDER contains ORDER_ITEM (1:N)
   - One order contains many items
   - Each item belongs to one order

3. ORDER has ORDER_ADDRESS (1:N)
   - One order has many addresses
   - Each address belongs to one order

4. ORDER has PAYMENT (1:N)
   - One order has many payments
   - Each payment belongs to one order

5. ORDER_ITEM references MODEL (N:1)
   - Many items can reference one model
   - Each item references one model

6. ORDER has ORDER_STATUS_HISTORY (1:N)
   - One order has many history records
   - Each history record belongs to one order

7. USER changes ORDER_STATUS_HISTORY (1:N)
   - One user makes many changes
   - Each change is made by one user

### 8.2 Logical ERD

**Entity: users**
- PK: users_id (UUID)
- email (String, unique)
- password (String, hashed)
- name (String)
- phone (String)
- is_admin (Boolean)
- created_at (Timestamp)

**Entity: orders**
- PK: orders_id (UUID)
- FK: user_id → users(users_id)
- status (String)
- total (Numeric)
- payment_status (String)
- customer_name (String)
- order_name (String)
- deadline (Date)

**Entity: order_items**
- PK: items_id (UUID)
- FK: order_id → orders(orders_id)
- FK: model_id → models(models_id)
- product_snapshot (JSONB)
- quantity (Integer)
- unit_price (Numeric)
- customization (JSONB)
- sablon_path (String)

**Entity: models**
- PK: models_id (UUID)
- name (String, unique)
- description (String)
- unit_price (Numeric)
- size_fields (JSONB)

**Entity: payments**
- PK: payment_id (UUID)
- FK: order_id → orders(orders_id)
- amount (Numeric)
- method (String)
- status (String)
- proof_url (String)

**Entity: order_status_history**
- PK: order_status_history_id (UUID)
- FK: order_id → orders(orders_id)
- FK: changed_by_id → users(users_id)
- old_status (String)
- new_status (String)
- changed_by_name (String)
- changed_by_email (String)
- note (String)
- created_at (Timestamp)

### 8.3 Cardinality Summary

| Relationship | Type | Description |
|-------------|------|-------------|
| users → orders | 1:N | One user creates many orders |
| orders → order_items | 1:N | One order contains many items |
| orders → payments | 1:N | One order has many payments |
| orders → order_status_history | 1:N | One order has many history records |
| order_items → models | N:1 | Many items reference one model |
| users → order_status_history | 1:N | One user makes many changes |


---

## 9. Database Table Specifications

### 9.1 Table: users

**Purpose**: Store user account information

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| users_id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique user identifier |
| email | TEXT | NOT NULL, UNIQUE | User email address (login) |
| password | TEXT | NOT NULL | Hashed password (bcrypt) |
| name | TEXT | | Full name of user |
| phone | TEXT | | Contact phone number |
| is_admin | BOOLEAN | DEFAULT false | Admin privilege flag |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT now() | Account creation timestamp |

**Relationships**:
- Referenced by orders.user_id
- Referenced by order_status_history.changed_by_id

---

### 9.2 Table: models

**Purpose**: Store product model templates with dynamic size fields

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| models_id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique model identifier |
| name | TEXT | NOT NULL, UNIQUE | Model name (e.g., "Kaos Oblong Dewasa") |
| description | TEXT | | Model description |
| unit_price | NUMERIC | | Base price per unit (optional) |
| size_fields | JSONB | DEFAULT '[]'::jsonb | Array of size field definitions |

**size_fields JSONB Structure**:
```json
[
  {
    "key": "lingkar_dada",
    "label": "Lingkar Dada",
    "type": "number",
    "unit": "cm"
  }
]
```

**Relationships**:
- Referenced by order_items.model_id

---

### 9.3 Table: orders

**Purpose**: Store main order information

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| orders_id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique order identifier |
| user_id | UUID | FOREIGN KEY → users(users_id) | User who created order |
| status | TEXT | DEFAULT 'pending' | Order status |
| total | NUMERIC | DEFAULT 0 | Total order amount |
| notes | TEXT | | Additional order notes |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT now() | Order creation timestamp |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT now() | Last update timestamp |
| order_date | TIMESTAMP WITH TIME ZONE | DEFAULT now() | Order date |
| deadline | DATE | | Delivery deadline |
| payment_status | TEXT | | Payment status |
| customer_name | TEXT | | Customer name for order |
| order_name | TEXT | | Order name/title |

**Valid status values**: created, confirmed, printing, shipped, delivered, cancelled

**Relationships**:
- FOREIGN KEY user_id → users.users_id
- Referenced by order_items.order_id
- Referenced by order_addresses.order_id
- Referenced by payments.order_id
- Referenced by order_status_history.order_id

---

### 9.4 Table: order_items

**Purpose**: Store individual items within an order

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| items_id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique item identifier |
| order_id | UUID | FOREIGN KEY → orders(orders_id) | Parent order |
| product_snapshot | JSONB | NOT NULL, DEFAULT '{}'::jsonb | Snapshot of product details |
| quantity | INTEGER | NOT NULL, DEFAULT 1 | Quantity ordered |
| unit_price | NUMERIC | NOT NULL, DEFAULT 0 | Price per unit |
| customization | JSONB | DEFAULT '{}'::jsonb | Custom size measurements |
| calculated_price | NUMERIC | NOT NULL, DEFAULT 0 | Total price (unit_price × quantity) |
| is_delivered | BOOLEAN | DEFAULT false | Delivery status flag |
| received_date | TIMESTAMP WITH TIME ZONE | | Date received by production |
| delivered_date | TIMESTAMP WITH TIME ZONE | | Date delivered to customer |
| sablon_path | TEXT | | Storage path to sablon design image |
| color_id | UUID | | Color identifier |
| model_id | UUID | FOREIGN KEY → models(models_id) | Reference to model template |

**product_snapshot JSONB Structure**:
```json
{
  "product": "Custom T-Shirt",
  "model": "Kaos Oblong Dewasa",
  "size": "L",
  "color": "White",
  "unit_price": 28000
}
```

**customization JSONB Structure**:
```json
{
  "lingkar_dada": 100,
  "panjang_baju": 70
}
```

**Relationships**:
- FOREIGN KEY order_id → orders.orders_id
- FOREIGN KEY model_id → models.models_id

---

### 9.5 Table: order_addresses

**Purpose**: Store delivery addresses for orders

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| order_address_id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique address identifier |
| order_id | UUID | FOREIGN KEY → orders(orders_id) | Parent order |
| address | TEXT | | Delivery address |
| phone | TEXT | | Contact phone for delivery |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT now() | Address creation timestamp |

**Relationships**:
- FOREIGN KEY order_id → orders.orders_id

---

### 9.6 Table: payments

**Purpose**: Store payment proof records

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| payment_id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique payment identifier |
| order_id | UUID | FOREIGN KEY → orders(orders_id) | Parent order |
| amount | NUMERIC | NOT NULL | Payment amount |
| method | TEXT | | Payment method (bank_transfer) |
| status | TEXT | DEFAULT 'pending' | Payment status |
| proof_url | TEXT | | URL to payment proof image |
| notes | TEXT | | Payment notes |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT now() | Payment submission timestamp |
| confirmed_at | TIMESTAMP WITH TIME ZONE | | Payment confirmation timestamp |

**Valid status values**: pending, completed, failed, refunded

**Relationships**:
- FOREIGN KEY order_id → orders.orders_id

---

### 9.7 Table: order_status_history

**Purpose**: Audit trail for order status changes

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| order_status_history_id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique history record identifier |
| order_id | UUID | FOREIGN KEY → orders(orders_id) | Parent order |
| old_status | TEXT | | Previous status |
| new_status | TEXT | | New status |
| changed_by | UUID | FOREIGN KEY → users(users_id) | User who made change (legacy) |
| changed_by_id | UUID | FOREIGN KEY → users(users_id) | User who made change |
| changed_by_email | TEXT | | Email of user who made change |
| changed_by_name | TEXT | | Name of user who made change |
| customer_name | TEXT | | Customer name (denormalized) |
| product | TEXT | | Product name (denormalized) |
| order_name | TEXT | | Order name (denormalized) |
| payment_status | TEXT | CHECK IN ('pending', 'completed', 'failed', 'refunded') | Payment status at time of change |
| note | TEXT | | Change note/reason |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT now() | Change timestamp |

**Relationships**:
- FOREIGN KEY order_id → orders.orders_id
- FOREIGN KEY changed_by → users.users_id
- FOREIGN KEY changed_by_id → users.users_id

---

## 10. Business Rules

### 10.1 Order Status Transitions

**Allowed Transitions**:
- created → confirmed, cancelled
- confirmed → printing, cancelled
- printing → shipped, cancelled
- shipped → delivered
- Any status → cancelled (with force flag)

### 10.2 Payment Rules

1. **Payment Eligibility**:
   - Order must have valid total > 0
   - Order cannot already be 'completed' payment status
   - Order must exist in database

2. **Payment Status Flow**:
   - Initial: No payment
   - After upload: 'pending'
   - After admin confirmation: 'completed'

### 10.3 Model Management Rules

1. **Model Deletion**:
   - Cannot delete model if referenced by existing order_items
   - Returns foreign key constraint error

2. **Model Updates**:
   - Name must remain unique
   - size_fields affects only new orders

### 10.4 User Access Rules

**Admin Access** (Only User Role):
- Can view all orders in the system
- Can create orders on behalf of any customer
- Can update any order status
- Can delete any order
- Can manage models (create, edit, delete)
- Can upload payment proofs for any order
- Can view complete order status history
- Full access to all system features

**Note:** This is an admin-only system. There are no customer user accounts. Admins create and manage all orders for external customers (tracking/reporting purposes). The `customer_name` field in orders stores information about the external customer, but customers do not have direct system access.

---

## 11. API Endpoints Summary

**Note:** This is an admin-only system. All endpoints are used by administrators to manage orders on behalf of external customers. Endpoints that appear to support user-specific access (e.g., GET /api/user/orders) are retained for backward compatibility but are effectively admin-operated.

### Authentication
- `POST /api/register` - Register new admin account
- `POST /api/login` - Admin login and get JWT token

### Orders
- `GET /api/user/orders` - Get orders (admin convenience endpoint, retained for compatibility)
- `GET /api/orders` - Get all orders in system (admin)
- `GET /api/orders/:id` - Get order details (admin)
- `POST /api/server/orders` - Create new order on behalf of customer (admin)
- `PUT /api/server/orders/:id/status` - Update order status (admin)
- `DELETE /api/orders/:id` - Delete order (admin)

### Payments
- `POST /api/server/orders/:id/payment` - Upload payment proof for order (admin)
- `GET /api/payments` - Get payment records (admin)

### Models
- `GET /api/models` - Get all models with size fields (admin)
- `POST /api/models` - Create new model (admin)
- `PATCH /api/models/:id` - Update model (admin)
- `DELETE /api/models/:id` - Delete model (admin)

### History
- `GET /api/order-status-history` - Get all order status changes (admin)

---

## Document Notes

**Created**: November 15, 2025  
**Author**: AI Agent (GitHub Copilot)  
**Purpose**: Complete system documentation for creating:
- Use case diagrams
- Use case scenarios
- Activity diagrams
- Sequence diagrams
- Class diagrams
- ERD (Conceptual and Logical)
- Database table specifications

**Repository**: ingreedzz/website_tracking  
**Technology**: Vue.js + Node.js + Supabase (PostgreSQL)

---

End of Document
