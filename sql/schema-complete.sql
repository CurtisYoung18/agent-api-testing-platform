-- Agent API Testing Platform - 完整数据库 schema
-- 在 Neon Console 的 SQL Editor 中运行此脚本（新建或更新数据库）

-- ============================================
-- 1. 创建 agents 表
-- ============================================
CREATE TABLE IF NOT EXISTS agents (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  model_name VARCHAR(100),
  region VARCHAR(10) NOT NULL CHECK (region IN ('SG', 'TH', 'CN', 'CUSTOM')),
  api_key VARCHAR(255) NOT NULL,
  custom_base_url VARCHAR(500),
  is_evaluator BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'active',
  last_used TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 若表已存在但缺少列，补充 model_name
ALTER TABLE agents ADD COLUMN IF NOT EXISTS model_name VARCHAR(100);

-- 若表已存在但缺少列，补充 is_evaluator
ALTER TABLE agents ADD COLUMN IF NOT EXISTS is_evaluator BOOLEAN DEFAULT FALSE;

-- 若表已存在但缺少列，补充 custom_base_url
ALTER TABLE agents ADD COLUMN IF NOT EXISTS custom_base_url VARCHAR(500);

-- 更新 region 约束（支持 TH、CUSTOM）
ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_region_check;
ALTER TABLE agents ADD CONSTRAINT agents_region_check CHECK (region IN ('SG', 'TH', 'CN', 'CUSTOM'));

-- ============================================
-- 2. 创建 test_history 表
-- ============================================
CREATE TABLE IF NOT EXISTS test_history (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
  agent_name VARCHAR(100) NOT NULL,
  test_date TIMESTAMP DEFAULT NOW(),
  total_questions INTEGER NOT NULL,
  passed_count INTEGER NOT NULL,
  failed_count INTEGER NOT NULL,
  success_rate DECIMAL(5,2) NOT NULL,
  duration_seconds INTEGER NOT NULL,
  avg_response_time DECIMAL(6,3),
  execution_mode VARCHAR(20) CHECK (execution_mode IN ('parallel', 'sequential')),
  rpm INTEGER,
  timeout_seconds INTEGER,
  retry_count INTEGER,
  excel_blob BYTEA,
  markdown_blob BYTEA,
  json_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 3. 创建索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_test_date ON test_history(test_date DESC);
CREATE INDEX IF NOT EXISTS idx_agent_id ON test_history(agent_id);
CREATE INDEX IF NOT EXISTS idx_success_rate ON test_history(success_rate);

-- ============================================
-- 4. 验证
-- ============================================
SELECT 'Schema 更新完成' AS message;
