-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'MODERATOR', 'MANAGER', 'SUPERVISOR', 'TECHNICIAN', 'OPERATOR', 'SUPER_ADMIN', 'SUPER_ADMIN_GOD', 'SOCIO_DIRETOR', 'HELPER_SYSTEM', 'WORKER', 'TI_SOFTWARE', 'GESTOR_PROJECT', 'GESTOR_CANTEIRO', 'VIEWER', 'GUEST');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION');

-- CreateEnum
CREATE TYPE "RecordType" AS ENUM ('entry', 'exit');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('PASSWORD_RESET', 'ADMINISTRATIVE', 'HR', 'OPERATIONAL', 'DIRECT', 'OTHER');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('PENDING', 'IN_ANALYSIS', 'AWAITING_RESPONSE', 'APPROVED', 'REJECTED', 'CLOSED', 'CLOSED_CANCELLED');

-- CreateEnum
CREATE TYPE "SyncOperation" AS ENUM ('insert', 'update', 'delete');

-- CreateEnum
CREATE TYPE "QrSessionStatus" AS ENUM ('pending', 'approved', 'expired', 'completed');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'FINISHED');

-- CreateEnum
CREATE TYPE "LandStatus" AS ENUM ('FREE', 'EMBARGO', 'IMPEDIMENT');

-- CreateEnum
CREATE TYPE "ImpedimentType" AS ENUM ('NONE', 'OWNER', 'CONTRACTOR', 'PROJECT', 'WORK');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "cpf" TEXT,
    "phone" TEXT,
    "registration_number" TEXT,
    "function_id" TEXT,
    "face_descriptor" JSONB,
    "hierarchy_level" INTEGER NOT NULL DEFAULT 0,
    "labor_type" TEXT DEFAULT 'MOD',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "iap_name" TEXT,
    "birth_date" TEXT,
    "gender" TEXT,
    "is_system_admin" BOOLEAN NOT NULL DEFAULT false,
    "permissions" JSONB,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_addresses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "cep" TEXT NOT NULL,
    "logradouro" TEXT NOT NULL,
    "complemento" TEXT,
    "unidade" TEXT,
    "bairro" TEXT NOT NULL,
    "localidade" TEXT NOT NULL,
    "uf" VARCHAR(2) NOT NULL,
    "estado" TEXT NOT NULL,
    "regiao" TEXT,
    "ibge" TEXT,
    "gia" TEXT,
    "ddd" TEXT,
    "siafi" TEXT,
    "number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_credentials" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "login" TEXT,
    "password" TEXT NOT NULL,
    "email_verified" TIMESTAMP(3),
    "role" "Role" NOT NULL DEFAULT 'USER',
    "status" "AccountStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "last_login_at" TIMESTAMP(3),
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "mfa_secret" TEXT,
    "system_use" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_affiliations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "company_id" TEXT,
    "project_id" TEXT,
    "site_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_affiliations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "route" TEXT,
    "user_agent" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tax_id" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "logo_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_functions" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "can_lead_team" BOOLEAN NOT NULL DEFAULT false,
    "hierarchy_level" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_functions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "address" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "planned_hours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "estimated_cost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sites" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "location_details" TEXT,
    "planned_hours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "x_lat" DECIMAL(30,20),
    "y_la" DECIMAL(30,20),

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_responsibles" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_responsibles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission_levels" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permission_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission_modules" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permission_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission_matrix" (
    "level_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "is_granted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permission_matrix_pkey" PRIMARY KEY ("level_id","module_id")
);

-- CreateTable
CREATE TABLE "project_permission_delegations" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "job_function_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "is_granted" BOOLEAN NOT NULL DEFAULT false,
    "granted_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_permission_delegations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "site_id" TEXT,
    "name" TEXT NOT NULL,
    "supervisor_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "labor_type" TEXT DEFAULT 'MOD',

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "construction_documents" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "project_id" TEXT,
    "site_id" TEXT,
    "name" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "file_url" TEXT NOT NULL,
    "file_size" BIGINT NOT NULL DEFAULT 0,
    "folder_path" TEXT NOT NULL DEFAULT '/',
    "status" TEXT NOT NULL DEFAULT 'valid',
    "created_by" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "construction_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "map_element_visibility" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "project_id" TEXT,
    "document_id" TEXT,
    "element_id" TEXT NOT NULL,
    "element_name" TEXT,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "element_color" TEXT,
    "element_height" DECIMAL(10,2),
    "element_elevation" DECIMAL(10,2),
    "element_angle" DECIMAL(5,2),
    "custom_model_url" TEXT,
    "custom_model_transform" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "map_element_visibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "map_element_technical_data" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "element_type" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "latitude" DECIMAL(30,10),
    "longitude" DECIMAL(30,10),
    "elevation" DECIMAL(10,2),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "display_settings" JSONB NOT NULL DEFAULT '{}',
    "document_id" TEXT,
    "geometry" JSONB,
    "name" TEXT,
    "path" JSONB,

    CONSTRAINT "map_element_technical_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_3d_cable_settings" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "settings" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_3d_cable_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_stages" (
    "id" TEXT NOT NULL,
    "site_id" TEXT,
    "parent_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "weight" DECIMAL(5,2) NOT NULL DEFAULT 1.0,
    "metadata" JSONB DEFAULT '{}',
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "production_activity_id" TEXT,
    "project_id" TEXT,

    CONSTRAINT "work_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "circuits" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'SINGLE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "color" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "voltage_kv" DECIMAL(10,2),

    CONSTRAINT "circuits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "segments" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "from_tower_id" TEXT NOT NULL,
    "to_tower_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "ground_level" DECIMAL(10,2),
    "length" DECIMAL(10,2),

    CONSTRAINT "segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "segment_circuits" (
    "segment_id" TEXT NOT NULL,
    "circuit_id" TEXT NOT NULL,

    CONSTRAINT "segment_circuits_pkey" PRIMARY KEY ("segment_id","circuit_id")
);

-- CreateTable
CREATE TABLE "conductors" (
    "id" TEXT NOT NULL,
    "segment_id" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cable_type" TEXT,
    "circuit_id" TEXT,
    "color" TEXT,
    "length" DECIMAL(10,2),
    "sag" DECIMAL(10,2),
    "tension" DECIMAL(10,2),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "voltage_kv" DECIMAL(10,2),

    CONSTRAINT "conductors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_progress" (
    "id" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "planned_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    "actual_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    "recorded_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stage_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_monthly_targets" (
    "id" TEXT NOT NULL,
    "project_id" TEXT,
    "site_id" TEXT,
    "company_id" TEXT,
    "target_month" DATE NOT NULL,
    "planned_hours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "planned_progress_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_monthly_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "team_id" TEXT,
    "company_id" TEXT,
    "record_type" "RecordType" NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "photo_url" TEXT,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "created_by" TEXT,
    "local_id" TEXT,
    "synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_reports" (
    "id" TEXT NOT NULL,
    "team_id" TEXT,
    "user_id" TEXT,
    "company_id" TEXT,
    "report_date" DATE NOT NULL,
    "activities" TEXT NOT NULL,
    "observations" TEXT,
    "created_by" TEXT,
    "local_id" TEXT,
    "synced_at" TIMESTAMP(3),
    "sub_point" TEXT,
    "sub_point_type" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_messages" (
    "id" TEXT NOT NULL,
    "sender_id" TEXT,
    "sender_email" TEXT,
    "recipient_id" TEXT,
    "recipient_user_id" TEXT,
    "recipient_role" TEXT,
    "company_id" TEXT,
    "project_id" TEXT,
    "site_id" TEXT,
    "message_type" "MessageType" NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "attachment_url" TEXT,
    "status" "MessageStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "resolved_by" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_history" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "old_status" TEXT,
    "new_status" TEXT,
    "performed_by" TEXT,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_queue" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "operation" "SyncOperation" NOT NULL,
    "table_name" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "synced_at" TIMESTAMP(3),

    CONSTRAINT "sync_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "status" "QrSessionStatus" NOT NULL DEFAULT 'pending',
    "auth_payload" JSONB,
    "expires_at" TIMESTAMP(3) NOT NULL DEFAULT (now() + '00:02:00'::interval),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qr_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "temporary_permissions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "permission_type" TEXT NOT NULL,
    "granted_by" TEXT,
    "ticket_id" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "temporary_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission_audit_logs" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_id" TEXT,
    "old_value" JSONB,
    "new_value" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permission_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "database_diagrams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "database_diagrams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_queue" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_anchors" (
    "id" TEXT NOT NULL,
    "model_url" TEXT NOT NULL,
    "mesh_name" TEXT,
    "position" JSONB NOT NULL,
    "normal" JSONB,
    "face_index" INTEGER,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "model_anchors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_3d_anchors" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "tower_id" TEXT,
    "anchors" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "model_3d_anchors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_activities" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "weight" DECIMAL(5,2) NOT NULL DEFAULT 1.0,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "map_element_production_progress" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "element_id" TEXT NOT NULL,
    "activity_id" TEXT NOT NULL,
    "current_status" "ActivityStatus" NOT NULL DEFAULT 'PENDING',
    "progress_percent" DECIMAL(5,2) DEFAULT 0.0,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "history" JSONB NOT NULL DEFAULT '[]',
    "dailyProduction" JSONB NOT NULL DEFAULT '{}',
    "requires_approval" BOOLEAN DEFAULT false,
    "approval_reason" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "map_element_production_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_schedule" (
    "id" TEXT NOT NULL,
    "activity_id" TEXT NOT NULL,
    "planned_start" DATE NOT NULL,
    "planned_end" DATE NOT NULL,
    "planned_quantity" DECIMAL(10,2),
    "planned_hhh" DECIMAL(10,2),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "element_id" TEXT NOT NULL,

    CONSTRAINT "activity_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_unit_costs" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "activity_id" TEXT NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "measure_unit" TEXT NOT NULL DEFAULT 'un',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_unit_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_delay_reasons" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "daily_cost" DECIMAL(10,2) NOT NULL,
    "category" "ImpedimentType" NOT NULL,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_delay_reasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delay_cost_config" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "daily_cost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "description" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delay_cost_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "governance_audit_history" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "performer_id" TEXT,
    "file" TEXT NOT NULL,
    "violation" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "suggestion" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "first_detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "governance_audit_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_health_history" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "performer_id" TEXT,
    "route" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "latency" TEXT NOT NULL,
    "code" INTEGER,
    "message" TEXT,
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "route_health_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "list_iap" (
    "id" TEXT NOT NULL,
    "setor" TEXT NOT NULL,
    "peso" DECIMAL(10,2) NOT NULL,
    "iap" DECIMAL(10,4) NOT NULL,
    "cost" DECIMAL(15,2) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "list_iap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control_iap" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "site_id" TEXT,
    "list_iap_id" TEXT NOT NULL,
    "setor" TEXT NOT NULL,
    "iap" DECIMAL(10,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "control_iap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_cpf_key" ON "users"("cpf");

-- CreateIndex
CREATE INDEX "users_registration_number_idx" ON "users"("registration_number");

-- CreateIndex
CREATE INDEX "users_cpf_idx" ON "users"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "user_addresses_user_id_key" ON "user_addresses"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_credentials_user_id_key" ON "auth_credentials"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_credentials_email_key" ON "auth_credentials"("email");

-- CreateIndex
CREATE UNIQUE INDEX "auth_credentials_login_key" ON "auth_credentials"("login");

-- CreateIndex
CREATE INDEX "auth_credentials_email_idx" ON "auth_credentials"("email");

-- CreateIndex
CREATE INDEX "auth_credentials_login_idx" ON "auth_credentials"("login");

-- CreateIndex
CREATE INDEX "auth_credentials_status_idx" ON "auth_credentials"("status");

-- CreateIndex
CREATE UNIQUE INDEX "user_affiliations_user_id_key" ON "user_affiliations"("user_id");

-- CreateIndex
CREATE INDEX "user_affiliations_company_id_idx" ON "user_affiliations"("company_id");

-- CreateIndex
CREATE INDEX "user_affiliations_project_id_idx" ON "user_affiliations"("project_id");

-- CreateIndex
CREATE INDEX "user_affiliations_site_id_idx" ON "user_affiliations"("site_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "companies_tax_id_key" ON "companies"("tax_id");

-- CreateIndex
CREATE INDEX "companies_tax_id_idx" ON "companies"("tax_id");

-- CreateIndex
CREATE INDEX "companies_is_active_idx" ON "companies"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "job_functions_company_id_name_key" ON "job_functions"("company_id", "name");

-- CreateIndex
CREATE INDEX "projects_company_id_idx" ON "projects"("company_id");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "projects_code_idx" ON "projects"("code");

-- CreateIndex
CREATE UNIQUE INDEX "projects_company_id_code_key" ON "projects"("company_id", "code");

-- CreateIndex
CREATE INDEX "sites_project_id_idx" ON "sites"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "sites_project_id_code_key" ON "sites"("project_id", "code");

-- CreateIndex
CREATE INDEX "site_responsibles_site_id_idx" ON "site_responsibles"("site_id");

-- CreateIndex
CREATE INDEX "site_responsibles_user_id_idx" ON "site_responsibles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "site_responsibles_site_id_user_id_key" ON "site_responsibles"("site_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "permission_levels_name_key" ON "permission_levels"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permission_modules_code_key" ON "permission_modules"("code");

-- CreateIndex
CREATE UNIQUE INDEX "project_permission_delegations_project_id_job_function_id_m_key" ON "project_permission_delegations"("project_id", "job_function_id", "module_id");

-- CreateIndex
CREATE INDEX "teams_company_id_idx" ON "teams"("company_id");

-- CreateIndex
CREATE INDEX "teams_site_id_idx" ON "teams"("site_id");

-- CreateIndex
CREATE INDEX "teams_supervisor_id_idx" ON "teams"("supervisor_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_user_id_key" ON "team_members"("user_id");

-- CreateIndex
CREATE INDEX "construction_documents_project_id_idx" ON "construction_documents"("project_id");

-- CreateIndex
CREATE INDEX "construction_documents_site_id_idx" ON "construction_documents"("site_id");

-- CreateIndex
CREATE INDEX "construction_documents_document_type_idx" ON "construction_documents"("document_type");

-- CreateIndex
CREATE UNIQUE INDEX "map_element_visibility_user_id_project_id_element_id_docume_key" ON "map_element_visibility"("user_id", "project_id", "element_id", "document_id");

-- CreateIndex
CREATE INDEX "map_element_technical_data_project_id_idx" ON "map_element_technical_data"("project_id");

-- CreateIndex
CREATE INDEX "map_element_technical_data_company_id_idx" ON "map_element_technical_data"("company_id");

-- CreateIndex
CREATE INDEX "map_element_technical_data_element_type_idx" ON "map_element_technical_data"("element_type");

-- CreateIndex
CREATE UNIQUE INDEX "map_element_technical_data_project_id_external_id_key" ON "map_element_technical_data"("project_id", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_3d_cable_settings_project_id_key" ON "project_3d_cable_settings"("project_id");

-- CreateIndex
CREATE INDEX "work_stages_project_id_idx" ON "work_stages"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "circuits_project_id_name_key" ON "circuits"("project_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "segments_project_id_from_tower_id_to_tower_id_key" ON "segments"("project_id", "from_tower_id", "to_tower_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_monthly_targets_project_id_site_id_target_month_key" ON "project_monthly_targets"("project_id", "site_id", "target_month");

-- CreateIndex
CREATE INDEX "time_records_user_id_idx" ON "time_records"("user_id");

-- CreateIndex
CREATE INDEX "time_records_recorded_at_idx" ON "time_records"("recorded_at");

-- CreateIndex
CREATE INDEX "time_records_company_id_idx" ON "time_records"("company_id");

-- CreateIndex
CREATE INDEX "daily_reports_team_id_idx" ON "daily_reports"("team_id");

-- CreateIndex
CREATE INDEX "daily_reports_report_date_idx" ON "daily_reports"("report_date");

-- CreateIndex
CREATE INDEX "system_messages_recipient_user_id_idx" ON "system_messages"("recipient_user_id");

-- CreateIndex
CREATE INDEX "system_messages_status_idx" ON "system_messages"("status");

-- CreateIndex
CREATE INDEX "system_messages_message_type_idx" ON "system_messages"("message_type");

-- CreateIndex
CREATE UNIQUE INDEX "qr_sessions_session_token_key" ON "qr_sessions"("session_token");

-- CreateIndex
CREATE INDEX "model_anchors_model_url_idx" ON "model_anchors"("model_url");

-- CreateIndex
CREATE UNIQUE INDEX "model_3d_anchors_company_id_project_id_tower_id_key" ON "model_3d_anchors"("company_id", "project_id", "tower_id");

-- CreateIndex
CREATE UNIQUE INDEX "map_element_production_progress_element_id_activity_id_key" ON "map_element_production_progress"("element_id", "activity_id");

-- CreateIndex
CREATE UNIQUE INDEX "activity_unit_costs_project_id_activity_id_key" ON "activity_unit_costs"("project_id", "activity_id");

-- CreateIndex
CREATE UNIQUE INDEX "delay_cost_config_project_id_key" ON "delay_cost_config"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "delay_cost_config_company_id_project_id_key" ON "delay_cost_config"("company_id", "project_id");

-- CreateIndex
CREATE INDEX "governance_audit_history_company_id_idx" ON "governance_audit_history"("company_id");

-- CreateIndex
CREATE INDEX "governance_audit_history_status_idx" ON "governance_audit_history"("status");

-- CreateIndex
CREATE INDEX "route_health_history_company_id_idx" ON "route_health_history"("company_id");

-- CreateIndex
CREATE INDEX "route_health_history_route_idx" ON "route_health_history"("route");

-- CreateIndex
CREATE INDEX "list_iap_setor_idx" ON "list_iap"("setor");

-- CreateIndex
CREATE INDEX "control_iap_user_id_idx" ON "control_iap"("user_id");

-- CreateIndex
CREATE INDEX "control_iap_project_id_idx" ON "control_iap"("project_id");

-- CreateIndex
CREATE INDEX "control_iap_company_id_idx" ON "control_iap"("company_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_function_id_fkey" FOREIGN KEY ("function_id") REFERENCES "job_functions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_credentials" ADD CONSTRAINT "auth_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_affiliations" ADD CONSTRAINT "user_affiliations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_affiliations" ADD CONSTRAINT "user_affiliations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_affiliations" ADD CONSTRAINT "user_affiliations_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_affiliations" ADD CONSTRAINT "user_affiliations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_functions" ADD CONSTRAINT "job_functions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sites" ADD CONSTRAINT "sites_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_responsibles" ADD CONSTRAINT "site_responsibles_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_matrix" ADD CONSTRAINT "permission_matrix_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "permission_levels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_matrix" ADD CONSTRAINT "permission_matrix_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "permission_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_permission_delegations" ADD CONSTRAINT "project_permission_delegations_job_function_id_fkey" FOREIGN KEY ("job_function_id") REFERENCES "job_functions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_permission_delegations" ADD CONSTRAINT "project_permission_delegations_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "permission_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_permission_delegations" ADD CONSTRAINT "project_permission_delegations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "construction_documents" ADD CONSTRAINT "construction_documents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "construction_documents" ADD CONSTRAINT "construction_documents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "construction_documents" ADD CONSTRAINT "construction_documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "construction_documents" ADD CONSTRAINT "construction_documents_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "map_element_visibility" ADD CONSTRAINT "map_element_visibility_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "construction_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "map_element_visibility" ADD CONSTRAINT "map_element_visibility_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "map_element_technical_data" ADD CONSTRAINT "map_element_technical_data_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "map_element_technical_data" ADD CONSTRAINT "map_element_technical_data_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "construction_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "map_element_technical_data" ADD CONSTRAINT "map_element_technical_data_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_3d_cable_settings" ADD CONSTRAINT "project_3d_cable_settings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_stages" ADD CONSTRAINT "work_stages_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "work_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_stages" ADD CONSTRAINT "work_stages_production_activity_id_fkey" FOREIGN KEY ("production_activity_id") REFERENCES "production_activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_stages" ADD CONSTRAINT "work_stages_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_stages" ADD CONSTRAINT "work_stages_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "circuits" ADD CONSTRAINT "circuits_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "segments" ADD CONSTRAINT "segments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "segment_circuits" ADD CONSTRAINT "segment_circuits_circuit_id_fkey" FOREIGN KEY ("circuit_id") REFERENCES "circuits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "segment_circuits" ADD CONSTRAINT "segment_circuits_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conductors" ADD CONSTRAINT "conductors_circuit_id_fkey" FOREIGN KEY ("circuit_id") REFERENCES "circuits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conductors" ADD CONSTRAINT "conductors_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_progress" ADD CONSTRAINT "stage_progress_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "work_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_progress" ADD CONSTRAINT "stage_progress_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_monthly_targets" ADD CONSTRAINT "project_monthly_targets_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_monthly_targets" ADD CONSTRAINT "project_monthly_targets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_monthly_targets" ADD CONSTRAINT "project_monthly_targets_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_records" ADD CONSTRAINT "time_records_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_records" ADD CONSTRAINT "time_records_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_records" ADD CONSTRAINT "time_records_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_records" ADD CONSTRAINT "time_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_messages" ADD CONSTRAINT "system_messages_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_messages" ADD CONSTRAINT "system_messages_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_messages" ADD CONSTRAINT "system_messages_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_messages" ADD CONSTRAINT "system_messages_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_history" ADD CONSTRAINT "ticket_history_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "system_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "temporary_permissions" ADD CONSTRAINT "temporary_permissions_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "system_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_3d_anchors" ADD CONSTRAINT "model_3d_anchors_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_3d_anchors" ADD CONSTRAINT "model_3d_anchors_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_activities" ADD CONSTRAINT "production_activities_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "production_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "map_element_production_progress" ADD CONSTRAINT "map_element_production_progress_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "production_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "map_element_production_progress" ADD CONSTRAINT "map_element_production_progress_element_id_fkey" FOREIGN KEY ("element_id") REFERENCES "map_element_technical_data"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "map_element_production_progress" ADD CONSTRAINT "map_element_production_progress_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_schedule" ADD CONSTRAINT "activity_schedule_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "production_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_schedule" ADD CONSTRAINT "activity_schedule_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_schedule" ADD CONSTRAINT "activity_schedule_element_id_fkey" FOREIGN KEY ("element_id") REFERENCES "map_element_technical_data"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_unit_costs" ADD CONSTRAINT "activity_unit_costs_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "production_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_unit_costs" ADD CONSTRAINT "activity_unit_costs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_delay_reasons" ADD CONSTRAINT "project_delay_reasons_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_delay_reasons" ADD CONSTRAINT "project_delay_reasons_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delay_cost_config" ADD CONSTRAINT "delay_cost_config_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delay_cost_config" ADD CONSTRAINT "delay_cost_config_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delay_cost_config" ADD CONSTRAINT "delay_cost_config_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "governance_audit_history" ADD CONSTRAINT "governance_audit_history_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "governance_audit_history" ADD CONSTRAINT "governance_audit_history_performer_id_fkey" FOREIGN KEY ("performer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_health_history" ADD CONSTRAINT "route_health_history_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_health_history" ADD CONSTRAINT "route_health_history_performer_id_fkey" FOREIGN KEY ("performer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_iap" ADD CONSTRAINT "control_iap_list_iap_id_fkey" FOREIGN KEY ("list_iap_id") REFERENCES "list_iap"("id") ON DELETE CASCADE ON UPDATE CASCADE;
