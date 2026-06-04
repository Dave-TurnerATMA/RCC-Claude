const BASE = '/api';

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const api = {
  get: (path: string) => request(path),
  post: (path: string, body: any) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path: string, body: any) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path: string) => request(path, { method: 'DELETE' }),

  // Teams
  getTeams: () => api.get('/teams'),

  // Users
  getUsers: (teamId: number) => api.get(`/teams/${teamId}/users`),
  createUser: (teamId: number, data: any) => api.post(`/teams/${teamId}/users`, data),
  updateUser: (teamId: number, userId: number, data: any) => api.put(`/teams/${teamId}/users/${userId}`, data),

  // Categories
  getCategories: (teamId: number) => api.get(`/teams/${teamId}/required-task-categories`),
  createCategory: (teamId: number, data: any) => api.post(`/teams/${teamId}/required-task-categories`, data),
  updateCategory: (teamId: number, id: number, data: any) => api.put(`/teams/${teamId}/required-task-categories/${id}`, data),
  deleteCategory: (teamId: number, id: number) => api.delete(`/teams/${teamId}/required-task-categories/${id}`),

  // Required Tasks
  getRequiredTasks: (teamId: number) => api.get(`/teams/${teamId}/required-tasks`),
  getTaskSummary: (teamId: number, id: number) => api.get(`/teams/${teamId}/required-tasks/${id}/summary`),
  getRequiredTaskLogs: (teamId: number, id: number) => api.get(`/teams/${teamId}/required-tasks/${id}/logs`),
  createRequiredTask: (teamId: number, data: any) => api.post(`/teams/${teamId}/required-tasks`, data),
  updateRequiredTask: (teamId: number, id: number, data: any) => api.put(`/teams/${teamId}/required-tasks/${id}`, data),
  archiveRequiredTask: (teamId: number, id: number, data?: any) => api.post(`/teams/${teamId}/required-tasks/${id}/archive`, data || {}),
  deleteRequiredTask: (teamId: number, id: number) => api.delete(`/teams/${teamId}/required-tasks/${id}`),

  // Scheduled Tasks
  getScheduledTasks: (teamId: number, params: Record<string, string> = {}) => {
    const q = new URLSearchParams(params).toString();
    return api.get(`/teams/${teamId}/scheduled-tasks${q ? '?' + q : ''}`);
  },
  getScheduledTaskHistory: (teamId: number, params: Record<string, string> = {}) => {
    const q = new URLSearchParams(params).toString();
    return api.get(`/teams/${teamId}/scheduled-tasks/history${q ? '?' + q : ''}`);
  },
  getScheduledTask: (teamId: number, id: number) => api.get(`/teams/${teamId}/scheduled-tasks/${id}`),
  createScheduledTask: (teamId: number, data: any) => api.post(`/teams/${teamId}/scheduled-tasks`, data),
  updateScheduledTask: (teamId: number, id: number, data: any) => api.put(`/teams/${teamId}/scheduled-tasks/${id}`, data),
  completeTask: (teamId: number, id: number, data: any) => api.post(`/teams/${teamId}/scheduled-tasks/${id}/complete`, data),
  updateProgress: (teamId: number, id: number, data: any) => api.post(`/teams/${teamId}/scheduled-tasks/${id}/progress`, data),
  addCrew: (teamId: number, taskId: number, userId: number) => api.post(`/teams/${teamId}/scheduled-tasks/${taskId}/crew`, { user_id: userId }),
  removeCrew: (teamId: number, taskId: number, userId: number) => api.delete(`/teams/${teamId}/scheduled-tasks/${taskId}/crew/${userId}`),
  addNote: (teamId: number, taskId: number, data: any) => api.post(`/teams/${teamId}/scheduled-tasks/${taskId}/notes`, data),
  requestTakeover: (teamId: number, taskId: number, data: any) => api.post(`/teams/${teamId}/scheduled-tasks/${taskId}/request-takeover`, data),

  // Equipment
  getEquipment: (teamId: number) => api.get(`/teams/${teamId}/equipment`),
  createEquipment: (teamId: number, data: any) => api.post(`/teams/${teamId}/equipment`, data),
  updateEquipment: (teamId: number, id: number, data: any) => api.put(`/teams/${teamId}/equipment/${id}`, data),
  deleteEquipment: (teamId: number, id: number) => api.delete(`/teams/${teamId}/equipment/${id}`),

  // Notifications
  getNotifications: (teamId: number, userId: number) => api.get(`/teams/${teamId}/notifications/${userId}`),
  markNotificationRead: (teamId: number, notifId: number) => api.put(`/teams/${teamId}/notifications/${notifId}/read`, {}),

  // Dashboard
  getDashboard: (teamId: number) => api.get(`/teams/${teamId}/dashboard`),

  // Uploads
  uploadFile: async (taskId: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${BASE}/uploads/${taskId}`, { method: 'POST', body: form });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  },
};
