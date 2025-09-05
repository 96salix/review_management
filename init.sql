CREATE TABLE users (

    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(255)
);

CREATE TABLE review_requests (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author_id VARCHAR(255) NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE review_stages (
    id VARCHAR(255) PRIMARY KEY,
    review_request_id VARCHAR(255) NOT NULL REFERENCES review_requests(id),
    name VARCHAR(255) NOT NULL,
    repository_url VARCHAR(255)
);

CREATE TABLE review_assignments (
    id VARCHAR(255) PRIMARY KEY,
    review_stage_id VARCHAR(255) NOT NULL REFERENCES review_stages(id),
    reviewer_id VARCHAR(255) NOT NULL REFERENCES users(id),
    status VARCHAR(50) NOT NULL
);

CREATE TABLE comments (
    id VARCHAR(255) PRIMARY KEY,
    review_stage_id VARCHAR(255) NOT NULL REFERENCES review_stages(id),
    author_id VARCHAR(255) NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    line_number INTEGER
);

CREATE TABLE activity_logs (
    id VARCHAR(255) PRIMARY KEY,
    review_request_id VARCHAR(255) NOT NULL REFERENCES review_requests(id),
    type VARCHAR(50) NOT NULL,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id),
    details TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE stage_templates (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE template_stages (
    id VARCHAR(255) PRIMARY KEY,
    stage_template_id VARCHAR(255) NOT NULL REFERENCES stage_templates(id),
    name VARCHAR(255) NOT NULL,
    reviewer_ids TEXT[] NOT NULL
);
