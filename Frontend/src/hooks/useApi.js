import { useState, useCallback } from 'react'
import { api } from '../context/AuthContext'
import toast from 'react-hot-toast'

export function useApi() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const request = useCallback(async (method, url, data = null, options = {}) => {
    setLoading(true)
    setError(null)
    try {
      const config = { method, url, ...options }
      if (data) {
        if (data instanceof FormData) {
          config.data = data
          config.headers = { 'Content-Type': 'multipart/form-data' }
        } else {
          config.data = data
        }
      }
      const res = await api(config)
      return { data: res.data, error: null }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'An error occurred'
      setError(msg)
      if (options.showError !== false) toast.error(msg)
      return { data: null, error: msg }
    } finally {
      setLoading(false)
    }
  }, [])

  const get = useCallback((url, params, opts) => request('get', url, null, { params, ...opts }), [request])
  const post = useCallback((url, data, opts) => request('post', url, data, opts), [request])
  const put = useCallback((url, data, opts) => request('put', url, data, opts), [request])
  const patch = useCallback((url, data, opts) => request('patch', url, data, opts), [request])
  const del = useCallback((url, opts) => request('delete', url, null, opts), [request])

  return { loading, error, get, post, put, patch, del }
}
