CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS review_requests (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    url TEXT,
    author_id VARCHAR(255) NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS review_stages (
    id VARCHAR(255) PRIMARY KEY,
    review_request_id VARCHAR(255) NOT NULL REFERENCES review_requests(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    stage_order INTEGER NOT NULL,
    repository_url VARCHAR(255),
    reviewer_count INTEGER,
    due_date DATE
);

CREATE TABLE IF NOT EXISTS review_assignments (
    id VARCHAR(255) PRIMARY KEY,
    review_stage_id VARCHAR(255) NOT NULL REFERENCES review_stages(id),
    reviewer_id VARCHAR(255) NOT NULL REFERENCES users(id),
    status VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS comments (
    id VARCHAR(255) PRIMARY KEY,
    review_stage_id VARCHAR(255) NOT NULL REFERENCES review_stages(id),
    author_id VARCHAR(255) NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    line_number INTEGER,
    parent_comment_id VARCHAR(255) REFERENCES comments(id) -- 親コメントIDを追加
);

CREATE TABLE IF NOT EXISTS activity_logs (
    id VARCHAR(255) PRIMARY KEY,
    review_request_id VARCHAR(255) NOT NULL REFERENCES review_requests(id),
    type VARCHAR(50) NOT NULL,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id),
    details TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS stage_templates (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS template_stages (
    id VARCHAR(255) PRIMARY KEY,
    stage_template_id VARCHAR(255) NOT NULL REFERENCES stage_templates(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    stage_order INTEGER NOT NULL,
    reviewer_ids TEXT[] NOT NULL,
    reviewer_count INTEGER
);

CREATE TABLE IF NOT EXISTS global_settings (
    id INT PRIMARY KEY,
    service_domain VARCHAR(255),
    default_reviewer_count INTEGER
);

INSERT INTO global_settings (id, service_domain, default_reviewer_count) VALUES (1, 'http://localhost:5174', 3) ON CONFLICT (id) DO NOTHING;
