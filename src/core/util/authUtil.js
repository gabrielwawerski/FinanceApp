import { LS_AUTH_TOKEN, LS_CURRENT_USER } from "@core/config.js";


export function getCurrentUser() {
  const userData = localStorage.getItem(LS_CURRENT_USER);
  return userData ? JSON.parse(userData) : null;
}

export function isAuthenticated() {
  return !!localStorage.getItem(LS_AUTH_TOKEN);
}

export async function login(username, password) {
  // In a real app, this would make an API call to authenticate
  // For offline-first, we might use local credentials or sync later
  const mockUser = {
	id: 1,
	username: username,
	name: username,
	email: `${username}@example.com`
  };

  localStorage.setItem(LS_AUTH_TOKEN, 'mock-token');
  localStorage.setItem(LS_CURRENT_USER, JSON.stringify(mockUser));
  return mockUser;
}

export function logout() {
  localStorage.removeItem(LS_AUTH_TOKEN);
  localStorage.removeItem(LS_CURRENT_USER);
}