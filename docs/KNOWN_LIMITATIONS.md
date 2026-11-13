# Known limitations

This document outlines intentional architectural simplifications, current constraints, and missing capabilities in Atlas.

## 1. Single-node in-memory STOMP broker

The WebSocket push implementation uses Spring's built-in simple in-memory broker (`/topic`).
- **Limitation:** Events are only published to clients connected to the same JVM instance. Atlas cannot be scaled out horizontally across multiple backend instances without an external message relay.
- **Production resolution:** Configure Spring's dedicated STOMP broker relay pointing to an external RabbitMQ or Redis instance.

## 2. In-memory estimation rate limiter

Rate limiting for LLM estimation requests (10 requests per user per minute) is tracked using an in-memory sliding window bucket.
- **Limitation:** Rate limit quotas reset upon application restart and are not synchronized across multiple backend server instances.
- **Production resolution:** Store request timestamps or token buckets in a centralized datastore such as Redis.

## 3. Client token storage in sessionStorage

JWT authentication tokens are stored in browser memory and `sessionStorage`, and transmitted via HTTP `Authorization: Bearer <token>` headers.
- **Limitation:** While `sessionStorage` avoids cross-tab persistence and isolates tokens from `localStorage`, it remains accessible to client-side JavaScript and is vulnerable to cross-site scripting (XSS).
- **Production resolution:** Issue authenticated session tokens via `httpOnly`, `Secure`, `SameSite=Strict` cookies with corresponding anti-CSRF token protection.

## 4. Static three-column board lifecycle

Boards are initialized with three default columns: "To do" (`TODO`), "In progress" (`IN_PROGRESS`), and "Done" (`DONE`).
- **Limitation:** Users cannot create custom columns, rename existing columns, delete columns, or reorder column positions.
- **Production resolution:** Implement dedicated REST endpoints and UI modals for board column CRUD and reordering operations.

## 5. Coarse-grained membership roles

The database schema supports `OWNER` and `MEMBER` roles.
- **Limitation:** In the current implementation, board owners and regular members possess identical permissions over boards and tasks. There is no fine-grained role-based access control (RBAC), permission delegation, or member management UI.
- **Production resolution:** Enforce role checks in `BoardService` and `TaskService` restricting board deletion, column configuration, and membership removal to owners.

## 6. Plaintext task descriptions and no attachments

Tasks support plain text descriptions up to 4,000 characters.
- **Limitation:** There is no support for rich text formatting, Markdown rendering, task comments, file attachments, or activity logs.
- **Production resolution:** Add attachment storage backed by S3/blob storage and relational tables for comments and activity audit logs.

## 7. No user lifecycle and authentication recovery

User registration requires an email and password of at least 10 characters.
- **Limitation:** There is no email verification, password reset, account lockout after failed attempts, session revocation, or multi-factor authentication (MFA).
- **Production resolution:** Integrate transactional email delivery (SMTP / SES) with short-lived verification and reset tokens.

## 8. No real-time presence indicators

Atlas broadcasts card modification, movement, and deletion events in real time.
- **Limitation:** Atlas does not transmit cursor coordinates, typing indicators, or a live list of currently active viewers on a board.
- **Production resolution:** Add ephemeral heartbeat channels tracking active connections per board topic.

## 9. Viewport responsiveness

The user interface is optimized for desktop and tablet displays (minimum viewport width 1024 px).
- **Limitation:** Navigation menus, multi-column task boards, and drag-and-drop interactions are not optimized for mobile screens.
- **Production resolution:** Design a single-column mobile view with bottom-sheet modals and tab-based column navigation.
