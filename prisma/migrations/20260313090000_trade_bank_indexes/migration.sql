-- CreateIndex
CREATE INDEX "trades_user_id_buy_bank_id_idx" ON "trades"("user_id", "buy_bank_id");

-- CreateIndex
CREATE INDEX "trades_user_id_sell_bank_id_idx" ON "trades"("user_id", "sell_bank_id");
