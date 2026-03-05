/**
 * Pagination configuration
 * These values should match the backend settings in backend/app/config.py
 */

export const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 25,
  MAX_PAGE_SIZE: 100,
  QUESTIONS_PER_PAGE: 25,
  STUDENTS_PER_PAGE: 25,
  ASSIGNMENTS_PER_PAGE: 25,
  TRAINING_FILES_PER_PAGE: 25,
  USERS_PER_PAGE: 25,
  SCHOOLS_PER_PAGE: 25,
  MASTER_DATA_PER_PAGE: 25,
} as const;

export default PAGINATION_CONFIG;
