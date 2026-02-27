# ExportHub — Backend PRD
## Node.js (Fastify) REST API Server

> **Dokumen:** Backend Product Requirements Document  
> **Versi:** 1.0  
> **Stack:** Node.js 20 LTS + Fastify 4.x + PostgreSQL + Redis + Docker  
> **Referensi:** ExportHub Frontend PRD v1.0

---

## Daftar Isi

1. [Ringkasan Arsitektur](#1-ringkasan-arsitektur)
2. [Tech Stack Detail](#2-tech-stack-detail)
3. [Struktur Folder Project](#3-struktur-folder-project)
4. [Konfigurasi & Environment](#4-konfigurasi--environment)
5. [Database Schema](#5-database-schema)
6. [Autentikasi & Keamanan](#6-autentikasi--keamanan)
7. [API Endpoints](#7-api-endpoints)
8. [Background Jobs & Queue](#8-background-jobs--queue)
9. [File Storage](#9-file-storage)
10. [Caching Strategy](#10-caching-strategy)
11. [Validasi & Error Handling](#11-validasi--error-handling)
12. [Logging & Monitoring](#12-logging--monitoring)
13. [Testing Strategy](#13-testing-strategy)
14. [Deployment & Infrastruktur](#14-deployment--infrastruktur)
15. [API Documentation](#15-api-documentation)

---

## 1. Ringkasan Arsitektur

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│              Vue.js 3 (Frontend) — Port 5173                    │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP/HTTPS + WebSocket
┌────────────────────────────▼────────────────────────────────────┐
│                       GATEWAY LAYER                             │
│              Nginx Reverse Proxy — Port 80/443                  │
│         Rate Limiting | SSL Termination | Static Files          │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    APPLICATION LAYER                            │
│            Fastify API Server — Port 3000                       │
│   Routes | Controllers | Services | Middleware | Plugins        │
└──────┬─────────────┬──────────────┬──────────────┬─────────────┘
       │             │              │              │
┌──────▼──┐   ┌──────▼──┐   ┌──────▼──┐   ┌──────▼──────────────┐
│PostgreSQL│   │  Redis  │   │BullMQ   │   │      MinIO          │
│ Docker  │   │ Docker  │   │  Queue  │   │  File Storage        │
│Port 5432│   │Port 6379│   │         │   │  Docker Port 9000    │
└─────────┘   └─────────┘   └─────────┘   └─────────────────────┘
```

### Prinsip Arsitektur

- **Layered Architecture** — Routes → Controllers → Services → Repositories
- **Separation of Concerns** — business logic di service layer, bukan di controller
- **Stateless API** — autentikasi via JWT, tidak ada server-side session
- **Async First** — semua I/O menggunakan async/await
- **Heavy Tasks di Background** — generate PDF, export Excel, kirim email via BullMQ
- **Self-hosted** — semua service berjalan di Docker, tidak bergantung pihak ketiga

---

## 2. Tech Stack Detail

### Core

| Komponen | Library / Version | Keterangan |
|---|---|---|
| Runtime | Node.js 20.x LTS | Long-term support, stable |
| Framework | Fastify 4.x | 2-3x lebih cepat dari Express |
| Language | TypeScript 5.x | Type safety, maintainability |
| ORM | Prisma 5.x | Type-safe, migration support |
| Database | PostgreSQL 16 (Docker) | RDBMS utama |
| Cache | Redis 7.x (Docker) | Cache + Queue broker |
| Queue | BullMQ 4.x | Background jobs, scheduled tasks |
| File Storage | MinIO (Docker) | S3-compatible self-hosted |

### Fastify Plugins

| Plugin | Fungsi |
|---|---|
| `@fastify/jwt` | JWT authentication |
| `@fastify/cors` | CORS policy |
| `@fastify/helmet` | Security headers |
| `@fastify/rate-limit` | Rate limiting per IP/user |
| `@fastify/multipart` | File upload handling |
| `@fastify/swagger` | Auto-generate API docs |
| `@fastify/swagger-ui` | Swagger UI di `/docs` |
| `@fastify/redis` | Redis client integration |
| `fastify-plugin` | Plugin encapsulation |

### Utilities

| Utility | Library | Fungsi |
|---|---|---|
| Validasi | Zod | Schema validation |
| PDF Generate | Puppeteer / PDFKit | Commercial Invoice, Packing List |
| Excel Export | ExcelJS | Laporan Excel |
| Email | Nodemailer + SMTP | Notifikasi email |
| Kriptografi | bcryptjs | Hash password |
| Tanggal | Day.js | Date formatting |
| Environment | dotenv + zod | Env validation |
| Logger | Pino (built-in Fastify) | Structured logging |
| File Storage | MinIO JS Client | Upload/download ke MinIO Docker |

---

## 3. Struktur Folder Project

```
exporthub-backend/
├── src/
│   ├── config/
│   │   ├── app.config.ts          # App configuration
│   │   ├── database.config.ts     # Prisma client instance
│   │   ├── redis.config.ts        # Redis client instance
│   │   ├── minio.config.ts        # MinIO client instance
│   │   └── env.config.ts          # Env validation dengan Zod
│   │
│   ├── plugins/
│   │   ├── auth.plugin.ts         # JWT plugin + decorator
│   │   ├── cors.plugin.ts         # CORS configuration
│   │   ├── helmet.plugin.ts       # Security headers
│   │   ├── rate-limit.plugin.ts   # Rate limiting
│   │   ├── swagger.plugin.ts      # API docs
│   │   └── multipart.plugin.ts    # File upload
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.schema.ts     # Zod schemas
│   │   │   └── auth.routes.ts
│   │   │
│   │   ├── users/
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── users.repository.ts
│   │   │   ├── users.schema.ts
│   │   │   └── users.routes.ts
│   │   │
│   │   ├── products/              # Modul Barang
│   │   │   ├── products.controller.ts
│   │   │   ├── products.service.ts
│   │   │   ├── products.repository.ts
│   │   │   ├── products.schema.ts
│   │   │   └── products.routes.ts
│   │   │
│   │   ├── inventory/             # Modul Stok
│   │   │   ├── inventory.controller.ts
│   │   │   ├── inventory.service.ts
│   │   │   ├── inventory.repository.ts
│   │   │   ├── inventory.schema.ts
│   │   │   └── inventory.routes.ts
│   │   │
│   │   ├── buyers/                # Modul Pelanggan
│   │   ├── orders/                # Modul Sales Order
│   │   ├── shipments/             # Modul Pengiriman
│   │   ├── invoices/              # Modul Keuangan
│   │   ├── reports/               # Modul Laporan
│   │   └── settings/              # Modul Pengaturan
│   │
│   ├── middleware/
│   │   ├── authenticate.ts        # Verify JWT token
│   │   ├── authorize.ts           # RBAC role check
│   │   └── audit-log.ts           # Log semua aksi CRUD
│   │
│   ├── jobs/
│   │   ├── queues/
│   │   │   ├── pdf.queue.ts       # Queue generate PDF
│   │   │   ├── excel.queue.ts     # Queue export Excel
│   │   │   ├── email.queue.ts     # Queue kirim email
│   │   │   └── notification.queue.ts
│   │   └── workers/
│   │       ├── pdf.worker.ts
│   │       ├── excel.worker.ts
│   │       ├── email.worker.ts
│   │       └── notification.worker.ts
│   │
│   ├── utils/
│   │   ├── pagination.ts          # Cursor/offset pagination
│   │   ├── response.ts            # Standard API response format
│   │   ├── currency.ts            # Currency conversion helper
│   │   ├── file-upload.ts         # MinIO upload helper
│   │   └── generate-sku.ts        # Auto SKU generator
│   │
│   ├── types/
│   │   ├── fastify.d.ts           # Fastify type augmentation
│   │   └── common.types.ts        # Shared TypeScript types
│   │
│   └── app.ts                     # Fastify app bootstrap
│
├── prisma/
│   ├── schema.prisma              # Database schema
│   ├── migrations/                # Migration files
│   └── seed.ts                    # Seed data
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
│
├── nginx/
│   └── nginx.conf                 # Nginx reverse proxy config
│
├── .env.example
├── .env
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## 4. Konfigurasi & Environment

### File `.env.example`

```env
# ── APP ──────────────────────────────────────
NODE_ENV=development
PORT=3000
API_PREFIX=/api/v1
APP_NAME=ExportHub API
CORS_ORIGIN=http://localhost:5173

# ── DATABASE (PostgreSQL Docker) ─────────────
DATABASE_URL=postgresql://exporthub:password@localhost:5432/exporthub_db

# ── REDIS (Docker) ────────────────────────────
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# ── JWT ──────────────────────────────────────
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_REFRESH_EXPIRES_IN=7d

# ── FILE STORAGE (MinIO Docker) ───────────────
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_BUCKET=exporthub
MINIO_USE_SSL=false

# ── EMAIL ─────────────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@exporthub.id
SMTP_PASS=your-email-password
EMAIL_FROM="ExportHub <noreply@exporthub.id>"

# ── RATE LIMIT ────────────────────────────────
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60000

# ── CURRENCY API (opsional) ───────────────────
EXCHANGE_RATE_API_KEY=
EXCHANGE_RATE_API_URL=https://api.exchangerate-api.com/v4/latest/USD
```

---

## 5. Database Schema

### Prisma Schema — Tabel Utama

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ── ENUM DEFINITIONS ──────────────────────────

enum Role {
  SUPER_ADMIN
  ADMIN_GUDANG
  ADMIN_PENJUALAN
  MANAGER
  VIEWER
}

enum ProductStatus {
  ACTIVE
  INACTIVE
  DISCONTINUED
}

enum OrderStatus {
  DRAFT
  CONFIRMED
  PACKING
  SHIPPED
  DELIVERED
  COMPLETED
  CANCELLED
}

enum PaymentStatus {
  UNPAID
  PARTIAL
  PAID
}

enum PaymentMethod {
  LC
  TT
  DP
}

enum BuyerSegment {
  VIP
  REGULAR
  NEW
}

enum StockMovementType {
  RECEIPT
  ISSUE
  TRANSFER_IN
  TRANSFER_OUT
  ADJUSTMENT
}

// ── USERS ─────────────────────────────────────

model User {
  id               String    @id @default(cuid())
  name             String
  email            String    @unique
  password         String
  role             Role      @default(VIEWER)
  isActive         Boolean   @default(true)
  twoFactorEnabled Boolean   @default(false)
  twoFactorSecret  String?
  lastLoginAt      DateTime?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  auditLogs AuditLog[]
  orders    Order[]    @relation("CreatedByUser")

  @@map("users")
}

// ── PRODUCTS (BARANG) ──────────────────────────

model Category {
  id        String   @id @default(cuid())
  name      String   @unique
  code      String   @unique
  createdAt DateTime @default(now())

  products Product[]

  @@map("categories")
}

model Product {
  id          String        @id @default(cuid())
  sku         String        @unique
  name        String
  description String?
  hsCode      String?
  categoryId  String
  category    Category      @relation(fields: [categoryId], references: [id])
  unit        String
  priceIdr    Decimal       @db.Decimal(15, 2)
  priceUsd    Decimal?      @db.Decimal(10, 2)
  priceEur    Decimal?      @db.Decimal(10, 2)
  minStock    Int           @default(0)
  status      ProductStatus @default(ACTIVE)
  images      ProductImage[]
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  orderItems OrderItem[]
  stockItems StockItem[]

  @@map("products")
}

model ProductImage {
  id        String   @id @default(cuid())
  productId String
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  url       String   // URL dari MinIO
  fileName  String
  isPrimary Boolean  @default(false)
  createdAt DateTime @default(now())

  @@map("product_images")
}

// ── WAREHOUSES & STOCK ─────────────────────────

model Warehouse {
  id        String   @id @default(cuid())
  code      String   @unique
  name      String
  address   String?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())

  stockItems StockItem[]
  movements  StockMovement[]

  @@map("warehouses")
}

model StockItem {
  id          String    @id @default(cuid())
  productId   String
  product     Product   @relation(fields: [productId], references: [id])
  warehouseId String
  warehouse   Warehouse @relation(fields: [warehouseId], references: [id])
  quantity    Int       @default(0)
  batchNo     String?
  expiredDate DateTime?
  updatedAt   DateTime  @updatedAt

  @@unique([productId, warehouseId, batchNo])
  @@map("stock_items")
}

model StockMovement {
  id          String            @id @default(cuid())
  productId   String
  warehouseId String
  warehouse   Warehouse         @relation(fields: [warehouseId], references: [id])
  type        StockMovementType
  quantity    Int
  batchNo     String?
  reference   String?
  notes       String?
  createdAt   DateTime          @default(now())
  createdById String

  @@map("stock_movements")
}

// ── BUYERS (PELANGGAN) ─────────────────────────

model Country {
  id     String  @id @default(cuid())
  code   String  @unique
  name   String
  region String?

  buyers Buyer[]
  orders Order[]

  @@map("countries")
}

model Buyer {
  id            String       @id @default(cuid())
  code          String       @unique
  companyName   String
  contactPerson String?
  email         String?
  phone         String?
  address       String?
  countryId     String
  country       Country      @relation(fields: [countryId], references: [id])
  segment       BuyerSegment @default(NEW)
  creditLimit   Decimal?     @db.Decimal(15, 2)
  paymentTerms  Int          @default(30)
  notes         String?
  isActive      Boolean      @default(true)
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  documents BuyerDocument[]
  orders    Order[]

  @@map("buyers")
}

model BuyerDocument {
  id        String   @id @default(cuid())
  buyerId   String
  buyer     Buyer    @relation(fields: [buyerId], references: [id], onDelete: Cascade)
  type      String   // NPWP, NIK, CONTRACT, dll
  fileName  String
  fileUrl   String   // URL dari MinIO
  createdAt DateTime @default(now())

  @@map("buyer_documents")
}

// ── ORDERS (SALES ORDER) ───────────────────────

model Order {
  id           String      @id @default(cuid())
  orderNo      String      @unique
  buyerId      String
  buyer        Buyer       @relation(fields: [buyerId], references: [id])
  countryId    String
  country      Country     @relation(fields: [countryId], references: [id])
  incoterms    String
  currency     String      @default("USD")
  exchangeRate Decimal?    @db.Decimal(10, 4)
  status       OrderStatus @default(DRAFT)
  notes        String?
  createdById  String
  createdBy    User        @relation("CreatedByUser", fields: [createdById], references: [id])
  confirmedAt  DateTime?
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  items    OrderItem[]
  shipment Shipment?
  invoice  Invoice?

  @@map("orders")
}

model OrderItem {
  id         String  @id @default(cuid())
  orderId    String
  order      Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId  String
  product    Product @relation(fields: [productId], references: [id])
  quantity   Int
  unitPrice  Decimal @db.Decimal(10, 2)
  totalPrice Decimal @db.Decimal(15, 2)
  notes      String?

  @@map("order_items")
}

// ── SHIPMENTS (PENGIRIMAN) ─────────────────────

model Shipment {
  id            String    @id @default(cuid())
  orderId       String    @unique
  order         Order     @relation(fields: [orderId], references: [id])
  shipmentNo    String    @unique
  vesselName    String?
  voyageNo      String?
  blNo          String?
  portOfLoading String?
  portOfDest    String?
  etd           DateTime?
  eta           DateTime?
  actualDepart  DateTime?
  actualArrive  DateTime?
  notes         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  documents ShipmentDocument[]

  @@map("shipments")
}

model ShipmentDocument {
  id         String   @id @default(cuid())
  shipmentId String
  shipment   Shipment @relation(fields: [shipmentId], references: [id], onDelete: Cascade)
  type       String   // PEB, COO, HEALTH_CERT, dll
  fileName   String
  fileUrl    String   // URL dari MinIO
  createdAt  DateTime @default(now())

  @@map("shipment_documents")
}

// ── INVOICES (KEUANGAN) ────────────────────────

model Invoice {
  id            String         @id @default(cuid())
  orderId       String         @unique
  order         Order          @relation(fields: [orderId], references: [id])
  invoiceNo     String         @unique
  invoiceDate   DateTime       @default(now())
  dueDate       DateTime?
  currency      String         @default("USD")
  subtotal      Decimal        @db.Decimal(15, 2)
  taxAmount     Decimal        @default(0) @db.Decimal(15, 2)
  totalAmount   Decimal        @db.Decimal(15, 2)
  paidAmount    Decimal        @default(0) @db.Decimal(15, 2)
  paymentStatus PaymentStatus  @default(UNPAID)
  paymentMethod PaymentMethod?
  pdfUrl        String?        // URL PDF dari MinIO
  notes         String?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  payments Payment[]

  @@map("invoices")
}

model Payment {
  id        String   @id @default(cuid())
  invoiceId String
  invoice   Invoice  @relation(fields: [invoiceId], references: [id])
  amount    Decimal  @db.Decimal(15, 2)
  currency  String
  paidAt    DateTime @default(now())
  reference String?
  notes     String?
  createdAt DateTime @default(now())

  @@map("payments")
}

// ── AUDIT LOG ──────────────────────────────────

model AuditLog {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  action    String   // CREATE, UPDATE, DELETE, LOGIN, LOGOUT
  module    String   // products, orders, invoices, dll
  recordId  String?
  oldData   Json?
  newData   Json?
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())

  @@map("audit_logs")
}
```

---

## 6. Autentikasi & Keamanan

### Alur Autentikasi JWT

```
[1] POST /api/v1/auth/login  →  { email, password }
      │
      ▼
[2] Verifikasi password dengan bcrypt.compare()
      │
      ▼
[3] Generate Access Token  (JWT, expire 15 menit)
    Generate Refresh Token (JWT, expire 7 hari)
    Simpan hash Refresh Token di Redis
      │
      ▼
[4] Response: { accessToken, refreshToken, user }

[5] Frontend simpan accessToken di memory
    Frontend simpan refreshToken di httpOnly Cookie

[6] Setiap request:  Authorization: Bearer <accessToken>

[7] Access Token expired?
      → POST /api/v1/auth/refresh (Refresh Token Rotation)
      → Dapatkan accessToken baru, refreshToken baru
      → Token lama langsung diinvalidasi di Redis

[8] Logout → hapus Refresh Token dari Redis
```

### RBAC — Role Based Access Control

```typescript
const PERMISSIONS = {
  SUPER_ADMIN:     ['*'],
  ADMIN_GUDANG:    [
    'products:read', 'products:write',
    'inventory:read', 'inventory:write',
    'warehouses:read', 'warehouses:write',
  ],
  ADMIN_PENJUALAN: [
    'products:read',
    'buyers:read', 'buyers:write',
    'orders:read', 'orders:write',
    'invoices:read', 'invoices:write',
    'shipments:read', 'shipments:write',
  ],
  MANAGER: [
    'dashboard:read',
    'reports:read',
    'orders:read',
    'inventory:read',
  ],
  VIEWER: [
    'dashboard:read',
  ],
}
```

### Security Checklist

- [x] JWT secret minimum 32 karakter
- [x] Password di-hash dengan bcrypt (salt rounds: 12)
- [x] Helmet.js untuk security headers (XSS, HSTS, dll)
- [x] Rate limiting: 100 req/menit per IP, login: 5 req/menit
- [x] CORS whitelist hanya origin yang diizinkan
- [x] Input validation semua endpoint dengan Zod
- [x] SQL injection prevention via Prisma parameterized query
- [x] File upload validasi tipe + max size (10MB)
- [x] HTTPS only di production (Nginx)
- [x] Refresh Token rotation — token lama langsung invalid

---

## 7. API Endpoints

### Standard Response Format

```json
// Success
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}

// Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Data tidak valid",
    "details": [
      { "field": "email", "message": "Format email tidak valid" }
    ]
  }
}
```

### M1 — Auth Endpoints

| Method | Endpoint | Deskripsi | Auth |
|--------|----------|-----------|------|
| POST | `/api/v1/auth/login` | Login user | ❌ |
| POST | `/api/v1/auth/logout` | Logout & invalidate token di Redis | ✅ |
| POST | `/api/v1/auth/refresh` | Refresh access token | ❌ (cookie) |
| GET  | `/api/v1/auth/me` | Data user yang sedang login | ✅ |
| POST | `/api/v1/auth/change-password` | Ganti password | ✅ |
| POST | `/api/v1/auth/2fa/enable` | Aktifkan 2FA | ✅ |
| POST | `/api/v1/auth/2fa/verify` | Verifikasi kode 2FA | ✅ |

### M2 — Products (Barang) Endpoints

| Method | Endpoint | Deskripsi | Role |
|--------|----------|-----------|------|
| GET | `/api/v1/products` | List barang (filter, search, paginate) | All |
| POST | `/api/v1/products` | Tambah barang baru | Admin Gudang+ |
| GET | `/api/v1/products/:id` | Detail barang | All |
| PUT | `/api/v1/products/:id` | Update barang | Admin Gudang+ |
| DELETE | `/api/v1/products/:id` | Soft delete barang | Super Admin |
| POST | `/api/v1/products/:id/images` | Upload foto ke MinIO | Admin Gudang+ |
| DELETE | `/api/v1/products/:id/images/:imageId` | Hapus foto dari MinIO | Admin Gudang+ |
| POST | `/api/v1/products/import` | Import via CSV/Excel | Super Admin |
| GET | `/api/v1/products/export` | Export ke Excel | Manager+ |
| GET | `/api/v1/categories` | List kategori | All |
| POST | `/api/v1/categories` | Tambah kategori | Super Admin |

### M3 — Inventory (Stok) Endpoints

| Method | Endpoint | Deskripsi | Role |
|--------|----------|-----------|------|
| GET | `/api/v1/inventory` | Overview stok semua gudang | Admin Gudang+ |
| GET | `/api/v1/inventory/:productId` | Stok per produk per gudang | Admin Gudang+ |
| POST | `/api/v1/inventory/receipt` | Input penerimaan barang | Admin Gudang |
| POST | `/api/v1/inventory/issue` | Input pengeluaran barang | Admin Gudang |
| POST | `/api/v1/inventory/transfer` | Transfer antar gudang | Admin Gudang |
| POST | `/api/v1/inventory/adjustment` | Stok opname / koreksi stok | Admin Gudang |
| GET | `/api/v1/inventory/movements` | Riwayat mutasi stok | Admin Gudang+ |
| GET | `/api/v1/inventory/low-stock` | Barang dengan stok menipis | Admin Gudang+ |
| GET | `/api/v1/warehouses` | List gudang | All |
| POST | `/api/v1/warehouses` | Tambah gudang baru | Super Admin |

### M4 — Buyers (Pelanggan) Endpoints

| Method | Endpoint | Deskripsi | Role |
|--------|----------|-----------|------|
| GET | `/api/v1/buyers` | List buyer (filter, search) | Admin Penjualan+ |
| POST | `/api/v1/buyers` | Tambah buyer baru | Admin Penjualan |
| GET | `/api/v1/buyers/:id` | Detail buyer | Admin Penjualan+ |
| PUT | `/api/v1/buyers/:id` | Update data buyer | Admin Penjualan |
| DELETE | `/api/v1/buyers/:id` | Soft delete buyer | Super Admin |
| POST | `/api/v1/buyers/:id/documents` | Upload dokumen ke MinIO | Admin Penjualan |
| DELETE | `/api/v1/buyers/:id/documents/:docId` | Hapus dokumen dari MinIO | Admin Penjualan |
| GET | `/api/v1/buyers/:id/orders` | Riwayat order per buyer | Admin Penjualan+ |

### M5 — Orders (Sales Order) Endpoints

| Method | Endpoint | Deskripsi | Role |
|--------|----------|-----------|------|
| GET | `/api/v1/orders` | List order (filter, paginate) | Admin Penjualan+ |
| POST | `/api/v1/orders` | Buat order baru (Draft) | Admin Penjualan |
| GET | `/api/v1/orders/:id` | Detail order | Admin Penjualan+ |
| PUT | `/api/v1/orders/:id` | Update order (jika masih Draft) | Admin Penjualan |
| POST | `/api/v1/orders/:id/confirm` | Konfirmasi order (auto reserve stok) | Admin Penjualan |
| POST | `/api/v1/orders/:id/cancel` | Batalkan order | Admin Penjualan |
| PUT | `/api/v1/orders/:id/status` | Update status order | Admin Penjualan |
| GET | `/api/v1/orders/:id/proforma` | Download Proforma Invoice (PDF) | Admin Penjualan |
| GET | `/api/v1/orders/:id/commercial-invoice` | Download Commercial Invoice (PDF) | Admin Penjualan |
| GET | `/api/v1/orders/:id/packing-list` | Download Packing List (PDF) | Admin Penjualan |

### M6 — Shipments (Pengiriman) Endpoints

| Method | Endpoint | Deskripsi | Role |
|--------|----------|-----------|------|
| GET | `/api/v1/shipments` | List semua shipment | Admin Penjualan+ |
| POST | `/api/v1/shipments` | Buat shipment baru | Admin Penjualan |
| GET | `/api/v1/shipments/:id` | Detail shipment | Admin Penjualan+ |
| PUT | `/api/v1/shipments/:id` | Update data shipment | Admin Penjualan |
| POST | `/api/v1/shipments/:id/documents` | Upload dokumen (PEB, COO) ke MinIO | Admin Penjualan |
| POST | `/api/v1/shipments/:id/notify` | Kirim notifikasi email ke buyer | Admin Penjualan |

### M7 — Finance (Keuangan) Endpoints

| Method | Endpoint | Deskripsi | Role |
|--------|----------|-----------|------|
| GET | `/api/v1/invoices` | List semua invoice | Admin Penjualan+ |
| GET | `/api/v1/invoices/:id` | Detail invoice | Admin Penjualan+ |
| PUT | `/api/v1/invoices/:id` | Update invoice | Admin Penjualan |
| POST | `/api/v1/invoices/:id/payment` | Input pembayaran | Admin Penjualan |
| GET | `/api/v1/invoices/:id/pdf` | Download PDF invoice dari MinIO | Admin Penjualan+ |
| GET | `/api/v1/finance/ar-aging` | AR Aging Report | Manager+ |
| GET | `/api/v1/finance/summary` | Ringkasan keuangan | Manager+ |
| GET | `/api/v1/currency/rates` | Kurs mata uang terkini | All |

### M8 — Reports (Laporan) Endpoints

| Method | Endpoint | Deskripsi | Role |
|--------|----------|-----------|------|
| GET | `/api/v1/reports/sales` | Laporan penjualan | Manager+ |
| GET | `/api/v1/reports/inventory` | Laporan stok | Manager+ |
| GET | `/api/v1/reports/shipments` | Laporan pengiriman | Manager+ |
| GET | `/api/v1/reports/finance` | Laporan keuangan | Manager+ |
| GET | `/api/v1/reports/hs-code` | Laporan per HS Code | Manager+ |
| POST | `/api/v1/reports/export` | Export laporan ke PDF/Excel | Manager+ |
| GET | `/api/v1/dashboard/stats` | KPI summary untuk dashboard | All |
| GET | `/api/v1/dashboard/charts` | Data chart penjualan | All |
| GET | `/api/v1/dashboard/top-products` | Top 5 barang terlaris | All |
| GET | `/api/v1/dashboard/export-map` | Data peta ekspor per negara | All |

### M9 — Users (Pengguna) Endpoints

| Method | Endpoint | Deskripsi | Role |
|--------|----------|-----------|------|
| GET | `/api/v1/users` | List semua user | Super Admin |
| POST | `/api/v1/users` | Tambah user baru | Super Admin |
| GET | `/api/v1/users/:id` | Detail user | Super Admin |
| PUT | `/api/v1/users/:id` | Update data user | Super Admin |
| PUT | `/api/v1/users/:id/role` | Ubah role user | Super Admin |
| DELETE | `/api/v1/users/:id` | Nonaktifkan user | Super Admin |
| GET | `/api/v1/audit-logs` | Riwayat audit log semua aktivitas | Super Admin |

---

## 8. Background Jobs & Queue

### BullMQ Queue Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  API Controller │────▶│  BullMQ Queue         │────▶│  Worker Process │
│  (add job)      │     │  (Redis Docker)       │     │  (process job)  │
└─────────────────┘     └──────────────────────┘     └─────────────────┘
```

### Definisi Queue & Worker

| Queue | Trigger | Worker Task |
|---|---|---|
| `pdf-generation` | Request download invoice/laporan | Generate PDF dengan Puppeteer, simpan ke MinIO |
| `excel-export` | Request export laporan Excel | Generate Excel dengan ExcelJS, simpan ke MinIO |
| `email-notification` | Order confirm, shipment update | Kirim email via Nodemailer |
| `stock-alert` | Cron job setiap jam | Cek stok < minimum, kirim alert ke Admin Gudang |
| `currency-sync` | Cron job setiap 6 jam | Sync kurs mata uang, simpan ke Redis |

### Contoh Job Payload

```typescript
// PDF Generation Job
interface PdfJobData {
  type: 'INVOICE' | 'PACKING_LIST' | 'PROFORMA' | 'REPORT'
  referenceId: string
  requestedBy: string
  minioBucket: string
  minioKey: string
}

// Email Notification Job
interface EmailJobData {
  to: string | string[]
  subject: string
  template: 'order_confirmed' | 'shipment_update' | 'stock_alert' | 'invoice'
  variables: Record<string, any>
}
```

---

## 9. File Storage (MinIO Docker)

### Struktur Bucket MinIO

```
exporthub/                        ← nama bucket utama
├── products/
│   └── {productId}/
│       ├── image-primary.jpg
│       └── image-2.jpg
├── buyers/
│   └── {buyerId}/
│       ├── npwp.pdf
│       └── contract.pdf
├── shipments/
│   └── {shipmentId}/
│       ├── peb.pdf
│       ├── coo.pdf
│       └── health-cert.pdf
├── generated/
│   ├── invoices/
│   │   └── INV-2024-001.pdf
│   └── reports/
│       └── report-sales-2024-01.xlsx
└── templates/
    ├── invoice-template.html
    └── packing-list-template.html
```

### Kebijakan Upload

| Tipe File | Format Diizinkan | Max Size |
|---|---|---|
| Foto produk | JPG, PNG, WebP | 5 MB |
| Dokumen buyer | PDF, JPG, PNG | 10 MB |
| Dokumen shipment | PDF | 10 MB |
| Import data | CSV, XLSX | 2 MB |

### MinIO Client Setup

```typescript
// src/config/minio.config.ts
import * as Minio from 'minio'

export const minioClient = new Minio.Client({
  endPoint:  process.env.MINIO_ENDPOINT!,
  port:      parseInt(process.env.MINIO_PORT!),
  useSSL:    process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!,
})
```

---

## 10. Caching Strategy (Redis Docker)

### Redis Cache Policy

| Data | TTL | Strategi |
|---|---|---|
| Dashboard stats | 5 menit | Cache-aside, invalidate saat ada order baru |
| Kurs mata uang | 6 jam | Di-refresh via cron job |
| List kategori | 1 jam | Invalidate saat ada CRUD kategori |
| List negara | 24 jam | Hampir tidak berubah |
| Top 5 produk | 30 menit | Cache-aside |
| Stok overview | 2 menit | Short TTL karena sering berubah |
| Refresh Token | 7 hari | Blacklist saat logout |

---

## 11. Validasi & Error Handling

### Error Code Standard

| HTTP Code | Error Code | Keterangan |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Input tidak valid |
| 401 | `UNAUTHORIZED` | Token tidak ada / expired |
| 403 | `FORBIDDEN` | Role tidak punya akses |
| 404 | `NOT_FOUND` | Data tidak ditemukan |
| 409 | `CONFLICT` | Duplikat data (SKU, email, dll) |
| 422 | `BUSINESS_RULE_ERROR` | Aturan bisnis dilanggar (stok kurang, dll) |
| 429 | `TOO_MANY_REQUESTS` | Rate limit terlampaui |
| 500 | `INTERNAL_ERROR` | Error server |

### Contoh Business Rule Error

```json
{
  "success": false,
  "error": {
    "code": "BUSINESS_RULE_ERROR",
    "message": "Stok tidak mencukupi untuk order ini",
    "details": [
      {
        "productId": "clx123",
        "productName": "Kopi Arabika Grade A",
        "requested": 100,
        "available": 45
      }
    ]
  }
}
```

---

## 12. Logging & Monitoring

### Log Levels (Pino)

| Level | Penggunaan |
|---|---|
| `fatal` | Server crash, container PostgreSQL/Redis down |
| `error` | Exception yang tidak tertangani |
| `warn` | Business rule violation, stok menipis |
| `info` | Request masuk, job selesai, login sukses |
| `debug` | Query detail (development only) |

### Structured Log Format

```json
{
  "level": "info",
  "time": "2024-01-15T08:30:00.000Z",
  "pid": 1234,
  "reqId": "req-abc123",
  "method": "POST",
  "url": "/api/v1/orders",
  "statusCode": 201,
  "responseTime": 45,
  "userId": "usr-xyz",
  "module": "orders"
}
```

---

## 13. Testing Strategy

### Test Coverage Target

| Layer | Coverage Target | Tool |
|---|---|---|
| Unit (Services) | > 80% | Vitest |
| Integration (API) | > 70% | Fastify inject + Vitest |
| E2E (Critical flows) | Semua happy path | Supertest |

### Critical Test Scenarios

```
✅ [AUTH] Login dengan kredensial valid/invalid
✅ [AUTH] Akses endpoint tanpa token ditolak
✅ [AUTH] Role yang tidak punya akses ditolak
✅ [ORDER] Konfirmasi order mereserve stok dengan benar
✅ [ORDER] Konfirmasi order gagal jika stok kurang
✅ [STOCK] Penerimaan barang menambah stok di PostgreSQL
✅ [STOCK] Pengeluaran barang mengurangi stok di PostgreSQL
✅ [INVOICE] Generate invoice dari order yang sudah confirmed
✅ [PAYMENT] Status invoice update otomatis (partial/paid)
✅ [STORAGE] Upload file berhasil tersimpan di MinIO
```

---

## 14. Deployment & Infrastruktur

### Docker Compose (Development & Production)

```yaml
# docker-compose.yml
version: '3.8'

services:

  api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: exporthub_api
    ports:
      - "3000:3000"
    env_file:
      - .env
    environment:
      DATABASE_URL: postgresql://exporthub:password@postgres:5432/exporthub_db
      REDIS_HOST: redis
      MINIO_ENDPOINT: minio
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_started
    restart: unless-stopped
    networks:
      - exporthub_net

  postgres:
    image: postgres:16-alpine
    container_name: exporthub_postgres
    environment:
      POSTGRES_DB: exporthub_db
      POSTGRES_USER: exporthub
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U exporthub -d exporthub_db"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - exporthub_net

  redis:
    image: redis:7-alpine
    container_name: exporthub_redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - exporthub_net

  minio:
    image: minio/minio:latest
    container_name: exporthub_minio
    ports:
      - "9000:9000"   # API endpoint
      - "9001:9001"   # Console UI (browser)
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin123
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data
    restart: unless-stopped
    networks:
      - exporthub_net

  nginx:
    image: nginx:alpine
    container_name: exporthub_nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - api
    restart: unless-stopped
    networks:
      - exporthub_net

volumes:
  postgres_data:
  redis_data:
  minio_data:

networks:
  exporthub_net:
    driver: bridge
```

### Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npx prisma generate

FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/app.js"]
```

### Spesifikasi Server (Rekomendasi)

| Skala | Spesifikasi | Keterangan |
|---|---|---|
| Development | 2 vCPU, 4 GB RAM, 50 GB SSD | Semua service 1 mesin |
| Production awal | 4 vCPU, 8 GB RAM, 100 GB SSD | Semua service 1 VPS |
| Production skala | Pisah per service | API, DB, Storage terpisah |

> Untuk production awal, semua container (API, PostgreSQL, Redis, MinIO, Nginx) dapat berjalan di **satu VPS 4 vCPU / 8 GB RAM** dengan Docker Compose.

---

## 15. API Documentation

### Akses Swagger UI

```
Development  :  http://localhost:3000/docs
Production   :  https://api.exporthub.id/docs  (akses terbatas internal)
```

### API Versioning

Semua endpoint menggunakan prefix `/api/v1/`. Breaking change di masa depan menggunakan `/api/v2/` tanpa menghapus v1 selama masa transisi minimum 3 bulan.

---

## Appendix — NPM Scripts

```json
{
  "scripts": {
    "dev":             "tsx watch src/app.ts",
    "build":           "tsc",
    "start":           "node dist/app.js",
    "db:migrate":      "prisma migrate dev",
    "db:migrate:prod": "prisma migrate deploy",
    "db:seed":         "tsx prisma/seed.ts",
    "db:studio":       "prisma studio",
    "docker:up":       "docker-compose up -d",
    "docker:down":     "docker-compose down",
    "docker:logs":     "docker-compose logs -f api",
    "docker:restart":  "docker-compose restart api",
    "test":            "vitest run",
    "test:watch":      "vitest",
    "test:coverage":   "vitest run --coverage",
    "lint":            "eslint src --ext .ts",
    "format":          "prettier --write src"
  }
}
```

---

*ExportHub Backend PRD v1.0 — Node.js (Fastify) + Docker Edition*  
*Semua service berjalan via Docker: PostgreSQL, Redis, MinIO, Nginx*