-- CreateEnum
CREATE TYPE "Role" AS ENUM ('TENANT', 'ADMIN', 'WORKER');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('PLUMBING', 'ELECTRICAL', 'HVAC', 'APPLIANCE', 'STRUCTURAL', 'PEST_CONTROL', 'GENERAL');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('NEW', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TicketSource" AS ENUM ('TENANT_REQUEST', 'INSPECTION', 'PREVENTIVE', 'ADMIN');

-- CreateEnum
CREATE TYPE "TenancyStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "WorkerAvailability" AS ENUM ('AVAILABLE', 'BUSY', 'OFFLINE');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('RENT', 'DEPOSIT', 'LATE_FEE', 'MAINTENANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('LEASE', 'ID', 'INSURANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "InspectionType" AS ENUM ('MOVE_IN', 'MOVE_OUT', 'ROUTINE', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "InspectionStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PostCategory" AS ENUM ('SALE', 'GIVEAWAY', 'ANNOUNCEMENT', 'QUESTION', 'OTHER');

-- CreateEnum
CREATE TYPE "ServiceOrderType" AS ENUM ('GROCERY', 'CLEANING', 'LAUNDRY', 'OTHER');

-- CreateEnum
CREATE TYPE "ServiceOrderStatus" AS ENUM ('PENDING', 'PROCESSING', 'FULFILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('TICKET_UPDATE', 'PAYMENT_DUE', 'INSPECTION', 'ANNOUNCEMENT', 'OTHER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_whitelist" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "approved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_whitelist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "zip_code" TEXT,
    "total_units" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "unit_number" TEXT NOT NULL,
    "floor" INTEGER,
    "bedrooms" INTEGER,
    "bathrooms" DOUBLE PRECISION,
    "square_feet" INTEGER,
    "rent_amount" DOUBLE PRECISION,
    "is_occupied" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenancies" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "lease_start" TIMESTAMP(3) NOT NULL,
    "lease_end" TIMESTAMP(3) NOT NULL,
    "rent_amount" DOUBLE PRECISION NOT NULL,
    "deposit_amount" DOUBLE PRECISION,
    "status" "TenancyStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenancies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "company_name" TEXT,
    "skills" TEXT[],
    "hourly_rate" DOUBLE PRECISION,
    "availability_status" "WorkerAvailability" NOT NULL DEFAULT 'AVAILABLE',
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "total_jobs" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "ticket_number" TEXT NOT NULL,
    "tenant_id" TEXT,
    "unit_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "TicketCategory" NOT NULL,
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TicketStatus" NOT NULL DEFAULT 'NEW',
    "source" "TicketSource" NOT NULL DEFAULT 'TENANT_REQUEST',
    "sla_hours" INTEGER,
    "sla_deadline" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "assigned_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_assignments" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "assigned_by" TEXT,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "estimated_completion" TIMESTAMP(3),

    CONSTRAINT "ticket_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_activity_log" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_attachments" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "uploaded_by" TEXT,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_type" TEXT,
    "file_size" INTEGER,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_records" (
    "id" TEXT NOT NULL,
    "tenancy_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "payment_type" "PaymentType" NOT NULL,
    "payment_method" TEXT,
    "payment_date" TIMESTAMP(3) NOT NULL,
    "receipt_path" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaded_by" TEXT,

    CONSTRAINT "payment_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "tenancy_id" TEXT NOT NULL,
    "document_type" "DocumentType" NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "uploaded_by" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspections" (
    "id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "inspector_id" TEXT,
    "inspection_type" "InspectionType",
    "scheduled_date" TIMESTAMP(3) NOT NULL,
    "completed_date" TIMESTAMP(3),
    "status" "InspectionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_findings" (
    "id" TEXT NOT NULL,
    "inspection_id" TEXT NOT NULL,
    "issue_description" TEXT NOT NULL,
    "severity" TEXT,
    "photo_path" TEXT,
    "ticket_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaded_by" TEXT,

    CONSTRAINT "inspection_findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_posts" (
    "id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" "PostCategory",
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_comments" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_orders" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "order_type" "ServiceOrderType",
    "items" JSONB NOT NULL,
    "status" "ServiceOrderStatus" NOT NULL DEFAULT 'PENDING',
    "order_date" TIMESTAMP(3) NOT NULL,
    "cutoff_date" TIMESTAMP(3),
    "fulfilled_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType",
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "related_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "email_whitelist_email_key" ON "email_whitelist"("email");

-- CreateIndex
CREATE UNIQUE INDEX "units_property_id_unit_number_key" ON "units"("property_id", "unit_number");

-- CreateIndex
CREATE UNIQUE INDEX "workers_user_id_key" ON "workers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_ticket_number_key" ON "tickets"("ticket_number");

-- CreateIndex
CREATE INDEX "tickets_status_idx" ON "tickets"("status");

-- CreateIndex
CREATE INDEX "tickets_tenant_id_idx" ON "tickets"("tenant_id");

-- CreateIndex
CREATE INDEX "tickets_created_at_idx" ON "tickets"("created_at");

-- CreateIndex
CREATE INDEX "tickets_ticket_number_idx" ON "tickets"("ticket_number");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_assignments_ticket_id_worker_id_key" ON "ticket_assignments"("ticket_id", "worker_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- AddForeignKey
ALTER TABLE "email_whitelist" ADD CONSTRAINT "email_whitelist_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenancies" ADD CONSTRAINT "tenancies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenancies" ADD CONSTRAINT "tenancies_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workers" ADD CONSTRAINT "workers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_assignments" ADD CONSTRAINT "ticket_assignments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_assignments" ADD CONSTRAINT "ticket_assignments_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_assignments" ADD CONSTRAINT "ticket_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_activity_log" ADD CONSTRAINT "ticket_activity_log_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_activity_log" ADD CONSTRAINT "ticket_activity_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_tenancy_id_fkey" FOREIGN KEY ("tenancy_id") REFERENCES "tenancies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_tenancy_id_fkey" FOREIGN KEY ("tenancy_id") REFERENCES "tenancies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_inspector_id_fkey" FOREIGN KEY ("inspector_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_findings" ADD CONSTRAINT "inspection_findings_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_findings" ADD CONSTRAINT "inspection_findings_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_findings" ADD CONSTRAINT "inspection_findings_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
