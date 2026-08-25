export const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;

export function normalizeUsername(input: string) {
  return input.trim();
}

export function usernameKey(input: string) {
  return normalizeUsername(input).toLowerCase();
}

export function usernameError() {
  return "Usernames are 3 to 20 characters. Letters, numbers and underscores only.";
}
