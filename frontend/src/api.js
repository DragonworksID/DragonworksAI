const AUTH_EXPIRED_EVENT = 'dragonworks:auth-expired'

export async function apiFetch(path, options) {
  const response = await fetch(path, options)
  if (response.status === 401) {
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
  }
  return response
}

export { AUTH_EXPIRED_EVENT }
