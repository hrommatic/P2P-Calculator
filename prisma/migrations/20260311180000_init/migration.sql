-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "telegram" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),
    "theme_preference" TEXT NOT NULL,
    "language_preference" TEXT NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("token")
);

-- CreateTable
CREATE TABLE "global_banks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "default_limit_uah" DOUBLE PRECISION NOT NULL,
    "color" TEXT NOT NULL,
    "logo_svg" TEXT,
    "is_active" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_banks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_banks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "global_bank_id" TEXT,
    "name" TEXT NOT NULL,
    "turnover_limit_uah" DOUBLE PRECISION NOT NULL,
    "initial_turnover_uah" DOUBLE PRECISION NOT NULL,
    "buy_turnover_uah" DOUBLE PRECISION NOT NULL,
    "sell_turnover_uah" DOUBLE PRECISION NOT NULL,
    "net_profit_uah" DOUBLE PRECISION NOT NULL,
    "trades_count" INTEGER NOT NULL,
    "notes" TEXT,
    "color" TEXT,
    "logo_svg" TEXT,
    "is_archived" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_banks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchanges" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exchanges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trades" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3),
    "buy_exchange" TEXT NOT NULL,
    "buy_bank_id" TEXT NOT NULL,
    "buy_bank_name" TEXT NOT NULL,
    "buy_rate" DOUBLE PRECISION NOT NULL,
    "buy_amount_uah" DOUBLE PRECISION NOT NULL,
    "buy_commission" DOUBLE PRECISION NOT NULL,
    "buy_commission_type" TEXT NOT NULL,
    "buy_usdt_amount" DOUBLE PRECISION NOT NULL,
    "sell_exchange" TEXT NOT NULL,
    "sell_bank_id" TEXT NOT NULL,
    "sell_bank_name" TEXT NOT NULL,
    "sell_rate" DOUBLE PRECISION NOT NULL,
    "sell_usdt_amount" DOUBLE PRECISION NOT NULL,
    "sell_amount_uah" DOUBLE PRECISION NOT NULL,
    "sell_commission" DOUBLE PRECISION NOT NULL,
    "sell_commission_type" TEXT NOT NULL,
    "extra_expenses_uah" DOUBLE PRECISION NOT NULL,
    "total_cost_uah" DOUBLE PRECISION NOT NULL,
    "gross_revenue_uah" DOUBLE PRECISION NOT NULL,
    "total_commissions_uah" DOUBLE PRECISION NOT NULL,
    "gross_profit_uah" DOUBLE PRECISION NOT NULL,
    "net_profit_uah" DOUBLE PRECISION NOT NULL,
    "roi_percent" DOUBLE PRECISION NOT NULL,
    "spread_per_unit" DOUBLE PRECISION NOT NULL,
    "spread_percent" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,

    CONSTRAINT "trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "site_name" TEXT NOT NULL,
    "curator_telegram" TEXT NOT NULL,
    "default_language" TEXT NOT NULL,
    "default_theme" TEXT NOT NULL,
    "bank_limit_mode" TEXT NOT NULL,
    "announcement" TEXT,
    "allow_registration" BOOLEAN NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "action_type" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "admin_nickname" TEXT NOT NULL,
    "target_user_id" TEXT,
    "details" TEXT NOT NULL,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "failed_attempts" (
    "rate_key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "locked_until" BIGINT,

    CONSTRAINT "failed_attempts_pkey" PRIMARY KEY ("rate_key")
);

-- CreateTable
CREATE TABLE "system_backups" (
    "filename" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_backups_pkey" PRIMARY KEY ("filename")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_nickname_key" ON "users"("nickname");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "user_banks_user_id_idx" ON "user_banks"("user_id");

-- CreateIndex
CREATE INDEX "trades_user_id_created_at_idx" ON "trades"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp" DESC);

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_banks" ADD CONSTRAINT "user_banks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_banks" ADD CONSTRAINT "user_banks_global_bank_id_fkey" FOREIGN KEY ("global_bank_id") REFERENCES "global_banks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
