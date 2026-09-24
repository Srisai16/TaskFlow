-- =====================================================================
-- TaskFlow — reference MySQL schema
-- ---------------------------------------------------------------------
-- Hibernate (spring.jpa.hibernate.ddl-auto=update) can create these
-- tables for you. This script documents the normalized design plus the
-- composite indexes that support the hot query paths, and can be run
-- manually on a fresh MySQL server (then set ddl-auto=validate).
-- =====================================================================

CREATE DATABASE IF NOT EXISTS taskflow
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE taskflow;

-- ---------------------------------------------------------------------
-- USERS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
    avatar_color VARCHAR(7),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_users_email UNIQUE (email)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- PROJECTS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    description VARCHAR(500),
    created_by BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_projects_creator FOREIGN KEY (created_by) REFERENCES users (id)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- PROJECT_MEMBERS (many-to-many)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_members (
    project_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    PRIMARY KEY (project_id, user_id),
    CONSTRAINT fk_pm_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
    CONSTRAINT fk_pm_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- TASKS — composite index on (project_id, status) serves the kanban view
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description VARCHAR(2000),
    status VARCHAR(20) NOT NULL DEFAULT 'TODO',
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    due_date DATE,
    position INT NOT NULL DEFAULT 0,
    project_id BIGINT NOT NULL,
    assignee_id BIGINT,
    created_by BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tasks_project_status (project_id, status),
    INDEX idx_tasks_assignee (assignee_id),
    INDEX idx_tasks_due_date (due_date),
    CONSTRAINT fk_tasks_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
    CONSTRAINT fk_tasks_assignee FOREIGN KEY (assignee_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_tasks_creator FOREIGN KEY (created_by) REFERENCES users (id)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- COMMENTS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comments (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    content VARCHAR(2000) NOT NULL,
    task_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_comments_task (task_id),
    CONSTRAINT fk_comments_task FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- NOTIFICATIONS — partial filtered index on unread per user
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    message VARCHAR(300) NOT NULL,
    project_name VARCHAR(120),
    user_id BIGINT NOT NULL,
    is_read BIT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notifications_user (user_id, is_read),
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- Representative reporting query: overdue open tasks per project
-- ---------------------------------------------------------------------
-- SELECT p.name AS project,
--        COUNT(*) AS overdue_open_tasks
-- FROM tasks t
-- JOIN projects p ON p.id = t.project_id
-- WHERE t.due_date < CURDATE() AND t.status <> 'DONE'
-- GROUP BY p.id, p.name
-- ORDER BY overdue_open_tasks DESC;