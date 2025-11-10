// API helpers with automatic authentication
import { getToken, handleAuthError } from './auth.js'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

/**
 * Authenticated fetch wrapper
 * Automatically injects auth header and handles 401/403 errors
 */
export async function authenticatedFetch(url, options = {}) {
  const token = getToken()
  
  if (!token) {
    handleAuthError('MISSING_TOKEN')
    throw new Error('Authentication required')
  }

  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`
  }

  const response = await fetch(url, {
    ...options,
    headers
  })

  // Handle auth errors
  if (response.status === 401) {
    const data = await response.json().catch(() => ({}))
    handleAuthError(data.code || 'INVALID_TOKEN')
    throw new Error(data.error || 'Authentication failed')
  }

  if (response.status === 403) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || 'Access denied')
  }

  return response
}

/**
 * GET request with authentication
 */
export async function apiGet(endpoint) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`
  const response = await authenticatedFetch(url, {
    method: 'GET'
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `Request failed with status ${response.status}`)
  }

  return response.json()
}

/**
 * POST request with authentication (JSON body)
 */
export async function apiPost(endpoint, data) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`
  const response = await authenticatedFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `Request failed with status ${response.status}`)
  }

  return response.json()
}

/**
 * POST request with authentication (FormData body)
 */
export async function apiPostFormData(endpoint, formData) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`
  const response = await authenticatedFetch(url, {
    method: 'POST',
    body: formData
    // Don't set Content-Type header - browser will set it with boundary for FormData
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `Request failed with status ${response.status}`)
  }

  return response.json()
}

/**
 * PUT request with authentication (JSON body)
 */
export async function apiPut(endpoint, data) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`
  const response = await authenticatedFetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `Request failed with status ${response.status}`)
  }

  return response.json()
}

/**
 * DELETE request with authentication
 */
export async function apiDelete(endpoint) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`
  const response = await authenticatedFetch(url, {
    method: 'DELETE'
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `Request failed with status ${response.status}`)
  }

  return response.json()
}
