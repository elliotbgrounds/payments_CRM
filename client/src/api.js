import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('crm_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('crm_token');
      localStorage.removeItem('crm_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

export const login = (data) => api.post('/auth/login', data).then(r => r.data);
export const getMe = () => api.get('/auth/me').then(r => r.data);
export const getUsers = () => api.get('/auth/users').then(r => r.data);
export const registerUser = (data) => api.post('/auth/register', data).then(r => r.data);

export const getCompanies = (params) => api.get('/companies', { params }).then(r => r.data);
export const getCompany = (id) => api.get(`/companies/${id}`).then(r => r.data);
export const createCompany = (data) => api.post('/companies', data).then(r => r.data);
export const updateCompany = (id, data) => api.patch(`/companies/${id}`, data).then(r => r.data);
export const deleteCompany = (id) => api.delete(`/companies/${id}`).then(r => r.data);
export const bulkUpdateCompanies = (data) => api.patch('/companies/bulk/update', data).then(r => r.data);
export const getAdjacentCompany = (id, params) => api.get(`/companies/${id}/adjacent`, { params }).then(r => r.data);

export const getContacts = (companyId) => api.get(`/companies/${companyId}/contacts`).then(r => r.data);
export const createContact = (companyId, data) => api.post(`/companies/${companyId}/contacts`, data).then(r => r.data);
export const updateContact = (companyId, contactId, data) => api.patch(`/companies/${companyId}/contacts/${contactId}`, data).then(r => r.data);
export const deleteContact = (companyId, contactId) => api.delete(`/companies/${companyId}/contacts/${contactId}`).then(r => r.data);

export const getNotes = (companyId) => api.get(`/companies/${companyId}/notes`).then(r => r.data);
export const createNote = (companyId, data) => api.post(`/companies/${companyId}/notes`, data).then(r => r.data);
export const deleteNote = (companyId, noteId) => api.delete(`/companies/${companyId}/notes/${noteId}`).then(r => r.data);

export const getTasks = (companyId) => api.get(`/companies/${companyId}/tasks`).then(r => r.data);
export const getGlobalTasks = (params) => api.get('/tasks/global', { params }).then(r => r.data);
export const createTask = (companyId, data) => api.post(`/companies/${companyId}/tasks`, data).then(r => r.data);
export const updateTask = (companyId, taskId, data) => api.patch(`/companies/${companyId}/tasks/${taskId}`, data).then(r => r.data);
export const deleteTask = (companyId, taskId) => api.delete(`/companies/${companyId}/tasks/${taskId}`).then(r => r.data);

export const getActivity = (companyId) => api.get(`/companies/${companyId}/activity`).then(r => r.data);
export const getGlobalActivity = () => api.get('/activity/global').then(r => r.data);

export const previewImport = (formData) => api.post('/import/preview', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
export const executeImport = (formData) => api.post('/import/execute', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
