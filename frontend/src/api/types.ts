export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

export type ColumnKind = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'OTHER';

export type Role = 'OWNER' | 'MEMBER';

export type EstimationSource = 'LLM' | 'FALLBACK';

export interface User {
  id: number;
  displayName: string;
  email: string;
}

export interface Member {
  id: number;
  displayName: string;
  role: Role;
}

export interface Task {
  id: number;
  boardId: number;
  columnId: number;
  title: string;
  description: string;
  position: number;
  estimateHours: number | null;
  priority: Priority;
  aiRationale: string | null;
  assigneeId: number | null;
  version: number;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface BoardColumn {
  id: number;
  name: string;
  kind: ColumnKind;
  position: number;
  tasks: Task[];
}

export interface BoardSummary {
  id: number;
  name: string;
  role: Role;
  memberCount: number;
  inviteCode?: string;
}

export interface BoardDetail {
  id: number;
  name: string;
  inviteCode: string;
  members: Member[];
  columns: BoardColumn[];
}

export interface RegisterRequest {
  displayName: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  expiresAt: string;
  user: User;
}

export interface CreateBoardRequest {
  name: string;
}

export interface JoinBoardRequest {
  inviteCode: string;
}

export interface CreateTaskRequest {
  columnId: number;
  title: string;
  description?: string;
  estimateHours?: number | null;
  priority?: Priority;
  rationale?: string | null;
  suggestionId?: number;
}

export interface TaskMove {
  columnId: number;
  afterTaskId: number | null;
}

export interface UpdateTaskRequest {
  version: number;
  title?: string;
  description?: string;
  estimateHours?: number | null;
  priority?: Priority;
  assigneeId?: number | null;
  move?: TaskMove;
}

export interface EstimateRequest {
  boardId: number;
  title: string;
  description?: string;
}

export interface EstimateResponse {
  suggestionId?: number;
  estimateHours: number;
  priority: Priority;
  rationale: string;
  source: EstimationSource;
  latencyMs: number;
}

export type BoardEventType =
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'TASK_MOVED'
  | 'TASK_DELETED'
  | 'BOARD_RESYNC'
  | 'MEMBER_JOINED';

export interface BoardEvent {
  eventId: string;
  type: BoardEventType;
  boardId: number;
  actorId: number;
  occurredAt: string;
  task: Task | null;
  taskId: number | null;
  member?: Member;
}

export interface FieldError {
  field: string;
  message: string;
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  code: string;
  currentTask?: Task;
  errors?: FieldError[];
}

export interface HealthResponse {
  status: string;
}
