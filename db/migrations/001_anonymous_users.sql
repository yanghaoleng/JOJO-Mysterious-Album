CREATE TABLE IF NOT EXISTS users (
  id BINARY(16) NOT NULL,
  kind ENUM('anonymous') NOT NULL DEFAULT 'anonymous',
  status ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
  created_at DATETIME(3) NOT NULL,
  last_seen_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_users_created_at (created_at, id),
  KEY idx_users_last_seen_at (last_seen_at, id),
  KEY idx_users_status_created_at (status, created_at, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS sessions (
  id BINARY(16) NOT NULL,
  user_id BINARY(16) NOT NULL,
  token_hash BINARY(32) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  last_seen_at DATETIME(3) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  absolute_expires_at DATETIME(3) NOT NULL,
  revoked_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sessions_token_hash (token_hash),
  KEY idx_sessions_user_active (user_id, revoked_at, expires_at),
  KEY idx_sessions_expires_at (expires_at),
  CONSTRAINT fk_sessions_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

