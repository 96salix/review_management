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
