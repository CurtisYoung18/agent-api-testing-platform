-- Agent API Testing Platform - 数据库初始化SQL
-- 在Neon Console的SQL Editor中运行此脚本

-- 1. 创建agents表
CREATE TABLE IF NOT EXISTS agents (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  region VARCHAR(10) NOT NULL CHECK (region IN ('SG', 'CN', 'CUSTOM')),
  api_key VARCHAR(255) NOT NULL,
  custom_base_url VARCHAR(500),
  status VARCHAR(20) DEFAULT 'active',
  last_used TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. 创建test_history表
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

-- 3. 创建索引
CREATE INDEX IF NOT EXISTS idx_test_date ON test_history(test_date DESC);
CREATE INDEX IF NOT EXISTS idx_agent_id ON test_history(agent_id);
CREATE INDEX IF NOT EXISTS idx_success_rate ON test_history(success_rate);

-- 4. 验证数据库结构
SELECT 'Agents表创建成功' as message;
SELECT 'Test History表创建成功' as message;

-- 显示表结构
\d agents
\d test_history


