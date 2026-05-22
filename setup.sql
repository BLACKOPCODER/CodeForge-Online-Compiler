CREATE DATABASE IF NOT EXISTS codeforge CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE codeforge;

CREATE TABLE IF NOT EXISTS code_files (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(255) NOT NULL DEFAULT 'Untitled',
  language    ENUM('python','c','cpp','java') NOT NULL,
  code        LONGTEXT NOT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS run_history (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  language        ENUM('python','c','cpp','java') NOT NULL,
  code            LONGTEXT NOT NULL,
  stdin           TEXT,
  stdout          TEXT,
  stderr          TEXT,
  exit_code       INT DEFAULT 0,
  execution_time  FLOAT,
  ran_at          DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SELECT 'CodeForge v2 database ready!' AS status;
