// utils/inputValidation.ts

/**
 * Checks if a string contains any special characters.
 * Returns true if special characters are found, false otherwise.
 */
export function hasSpecialCharacters(input: string): boolean {
  // Allow only letters, numbers, and spaces
  return /[^a-zA-Z0-9 ]/.test(input);
}

/**
 * Removes all special characters from a string, leaving only letters, numbers, and spaces.
 */
export function removeSpecialCharacters(input: string): string {
  return input.replace(/[^a-zA-Z0-9 ]/g, '');
}

/**
 * Returns true if the input is valid (no special characters), false otherwise.
 */
export function isValidInput(input: string): boolean {
  return !hasSpecialCharacters(input);
}
