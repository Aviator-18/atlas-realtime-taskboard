import type {
  AuthResponse,
  BoardDetail,
  BoardSummary,
  CreateBoardRequest,
  CreateTaskRequest,
  EstimateRequest,
  EstimateResponse,
  HealthResponse,
  JoinBoardRequest,
  LoginRequest,
  ProblemDetails,
  RegisterRequest,
  Task,
  UpdateTaskRequest,
  User,
} from './types';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

const TOKEN_STORAGE_KEY = 'atlas_token';

let inMemoryToken: string | null = null;

export function getAuthToken(): string | null {
  if (inMemoryToken) {
    return inMemoryToken;
  }
  if (typeof window !== 'undefined' && window.sessionStorage) {
    const stored = window.sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (stored) {
      inMemoryToken = stored;
      return stored;
    }
  }
  return null;
}

export function setAuthToken(token: string | null): void {
  inMemoryToken = token;
  if (typeof window !== 'undefined' && window.sessionStorage) {
    if (token) {
      window.sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ProblemDetails;

  constructor(details: ProblemDetails) {
    super(details.detail || details.title || 'Request failed');
    this.name = 'ApiError';
    this.status = details.status;
    this.code = details.code;
    this.details = details;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let problem: ProblemDetails;
    try {
      problem = await response.json();
    } catch {
      problem = {
        type: 'about:blank',
        title: response.statusText || 'Request failed',
        status: response.status,
        detail: `HTTP error ${response.status}`,
        code: 'REQUEST_FAILED',
      };
    }
    throw new ApiError(problem);
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return response.json();
}

export const authApi = {
  register: (body: RegisterRequest): Promise<AuthResponse> =>
    request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (body: LoginRequest): Promise<AuthResponse> =>
    request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  me: (): Promise<User> => request<User>('/api/me'),
};

export const boardsApi = {
  list: (): Promise<BoardSummary[]> => request<BoardSummary[]>('/api/boards'),

  create: (body: CreateBoardRequest): Promise<BoardSummary> =>
    request<BoardSummary>('/api/boards', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  join: (body: JoinBoardRequest): Promise<BoardSummary> =>
    request<BoardSummary>('/api/boards/join', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  get: (boardId: number): Promise<BoardDetail> =>
    request<BoardDetail>(`/api/boards/${boardId}`),
};

export const tasksApi = {
  create: (boardId: number, body: CreateTaskRequest): Promise<Task> =>
    request<Task>(`/api/boards/${boardId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (taskId: number, body: UpdateTaskRequest): Promise<Task> =>
    request<Task>(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  delete: (taskId: number, version: number): Promise<void> =>
    request<void>(`/api/tasks/${taskId}?version=${version}`, {
      method: 'DELETE',
    }),

  estimate: (body: EstimateRequest): Promise<EstimateResponse> =>
    request<EstimateResponse>('/api/tasks/estimate', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

export async function fetchHealth(): Promise<HealthResponse> {
  return request<HealthResponse>('/actuator/health');
}
