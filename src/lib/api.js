// API helper with authentication and error handling
import { getToken, handleAuthError } from './auth'

// Make authenticated API call
export async function authenticatedFetch(url, options = {}) {
  const token = getToken()
  
  if (!token) {
    throw new Error('No authentication token')
  }
  
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`
  }
  
  try {
    const response = await fetch(url, { ...options, headers })
    
    // Handle authentication errors
    if (response.status === 401) {
      const errorData = await response.json().catch(() => ({}))
      const authError = handleAuthError(errorData)
      
      if (authError.expired) {
        throw new Error('Your session has expired. Please login again.')
      } else if (authError.invalid) {
        throw new Error('Invalid authentication. Please login again.')
      }
      
      throw new Error(errorData.error || 'Authentication failed')
    }
    
    // Handle forbidden errors
    if (response.status === 403) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || 'Access denied')
    }
    
    return response
  } catch (error) {
    // Re-throw for caller to handle
    throw error
  }
}

// Helper for making authenticated GET requests
export async function apiGet(url) {
  const response = await authenticatedFetch(url, { method: 'GET' })
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `Request failed with status ${response.status}`)
  }
  
  return response.json()
}

// Helper for making authenticated POST requests
export async function apiPost(url, data) {
  const response = await authenticatedFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `Request failed with status ${response.status}`)
  }
  
  return response.json()
}

// Helper for making authenticated PUT requests
export async function apiPut(url, data) {
  const response = await authenticatedFetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `Request failed with status ${response.status}`)
  }
  
  return response.json()
}

// Helper for making authenticated DELETE requests
export async function apiDelete(url) {
  const response = await authenticatedFetch(url, { method: 'DELETE' })
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `Request failed with status ${response.status}`)
  }
  
  return response.json()
}

// Helper for making authenticated multipart/form-data requests
export async function apiPostFormData(url, formData) {
  const token = getToken()
  
  if (!token) {
    throw new Error('No authentication token')
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
      // Don't set Content-Type for FormData - browser will set it with boundary
    },
    body: formData
  })
  
  // Handle authentication errors
  if (response.status === 401) {
    const errorData = await response.json().catch(() => ({}))
    const authError = handleAuthError(errorData)
    
    if (authError.expired) {
      throw new Error('Your session has expired. Please login again.')
    } else if (authError.invalid) {
      throw new Error('Invalid authentication. Please login again.')
    }
    
    throw new Error(errorData.error || 'Authentication failed')
  }
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `Request failed with status ${response.status}`)
  }
  
  return response.json()
}
