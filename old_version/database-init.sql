-- Agent API Testing Platform - 数据库初始化SQL
-- 在Neon Console的SQL Editor中运行此脚本

-- 1. 创建agents表
CREATE TABLE IF NOT EXISTS agents (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  region VARCHAR(10) NOT NULL CHECK (region IN ('SG', 'CN')),
  api_key VARCHAR(255) NOT NULL,
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

-- 4. 插入6个mock agents
INSERT INTO agents (name, region, api_key, last_used) VALUES
  ('Production SG Agent', 'SG', 'sk-prod-sg-mock1234567890abcdef4Xz7', NOW() - INTERVAL '2 hours'),
  ('Test SG Agent', 'SG', 'sk-test-sg-mock1234567890abcdef9Bc3', NOW() - INTERVAL '8 hours'),
  ('Production CN Agent', 'CN', 'sk-prod-cn-mock1234567890abcdef6Mn8', NOW() - INTERVAL '1 day'),
  ('Test CN Agent', 'CN', 'sk-test-cn-mock1234567890abcdef2Lp4', NOW() - INTERVAL '1 day'),
  ('Dev SG Agent', 'SG', 'sk-dev-sg-mock1234567890abcdef8Qr5', NOW() - INTERVAL '2 days'),
  ('QA CN Agent', 'CN', 'sk-qa-cn-mock1234567890abcdef3Wy9', NOW() - INTERVAL '3 days')
ON CONFLICT DO NOTHING;

-- 5. 插入1条mock测试历史（可选）
INSERT INTO test_history (
  agent_id, 
  agent_name, 
  test_date, 
  total_questions, 
  passed_count, 
  failed_count, 
  success_rate, 
  duration_seconds, 
  avg_response_time, 
  execution_mode, 
  rpm, 
  timeout_seconds, 
  retry_count,
  json_data
) VALUES (
  1,
  'Production SG Agent',
  NOW() - INTERVAL '5 hours',
  150,
  142,
  8,
  94.67,
  225,
  2.8,
  'parallel',
  60,
  30,
  3,
  '{"summary": "测试完成", "results": []}'::jsonb
)
ON CONFLICT DO NOTHING;

-- 6. 验证数据
SELECT 'Agents创建成功:' as message, COUNT(*) as count FROM agents;
SELECT 'Test History创建成功:' as message, COUNT(*) as count FROM test_history;

-- 显示所有agents
SELECT id, name, region, 
       LEFT(api_key, 15) || '***' || RIGHT(api_key, 4) as api_key_masked,
       last_used, created_at 
FROM agents 
ORDER BY last_used DESC;

