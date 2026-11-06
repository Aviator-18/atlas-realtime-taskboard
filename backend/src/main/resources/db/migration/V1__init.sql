CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    display_name  VARCHAR(80)  NOT NULL,
    email         VARCHAR(254) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_users_email_lower ON users (lower(email));

CREATE TABLE boards (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    invite_code CHAR(8)      NOT NULL UNIQUE,
    owner_id    BIGINT       NOT NULL REFERENCES users (id),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE board_members (
    board_id  BIGINT      NOT NULL REFERENCES boards (id) ON DELETE CASCADE,
    user_id   BIGINT      NOT NULL REFERENCES users (id)  ON DELETE CASCADE,
    role      VARCHAR(10) NOT NULL CHECK (role IN ('OWNER', 'MEMBER')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (board_id, user_id)
);

CREATE TABLE board_columns (
    id       BIGSERIAL PRIMARY KEY,
    board_id BIGINT      NOT NULL REFERENCES boards (id) ON DELETE CASCADE,
    name     VARCHAR(60) NOT NULL,
    kind     VARCHAR(12) NOT NULL CHECK (kind IN ('TODO', 'IN_PROGRESS', 'DONE', 'OTHER')),
    position INTEGER     NOT NULL
);
CREATE INDEX ix_board_columns_board ON board_columns (board_id, position);

CREATE TABLE tasks (
    id              BIGSERIAL PRIMARY KEY,
    board_id        BIGINT        NOT NULL REFERENCES boards (id) ON DELETE CASCADE,
    column_id       BIGINT        NOT NULL REFERENCES board_columns (id),
    title           VARCHAR(120)  NOT NULL,
    description     TEXT          NOT NULL DEFAULT '',
    position        INTEGER       NOT NULL,
    assignee_id     BIGINT        REFERENCES users (id) ON DELETE SET NULL,
    estimate_hours  NUMERIC(4, 1) CHECK (estimate_hours >= 0.5 AND estimate_hours <= 40),
    priority        VARCHAR(6)    NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
    ai_rationale    VARCHAR(200),
    version         BIGINT        NOT NULL DEFAULT 0,
    created_by      BIGINT        NOT NULL REFERENCES users (id),
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ
);
CREATE INDEX ix_tasks_column_position ON tasks (column_id, position);
CREATE INDEX ix_tasks_board_completed ON tasks (board_id, completed_at DESC)
    WHERE completed_at IS NOT NULL;

CREATE TABLE estimate_suggestions (
    id                 BIGSERIAL PRIMARY KEY,
    board_id           BIGINT       NOT NULL REFERENCES boards (id) ON DELETE CASCADE,
    requested_by       BIGINT       NOT NULL REFERENCES users (id),
    source             VARCHAR(8)   NOT NULL CHECK (source IN ('LLM', 'FALLBACK')),
    suggested_hours    NUMERIC(4, 1) NOT NULL,
    suggested_priority VARCHAR(6)   NOT NULL,
    latency_ms         INTEGER      NOT NULL,
    outcome            VARCHAR(10)  NOT NULL DEFAULT 'PENDING'
                       CHECK (outcome IN ('PENDING', 'ACCEPTED', 'EDITED')),
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);
