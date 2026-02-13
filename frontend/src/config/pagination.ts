/**
 * Pagination configuration
 * These values should match the backend settings in backend/app/config.py
 */

export const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  QUESTIONS_PER_PAGE: 10,
  STUDENTS_PER_PAGE: 10,
  ASSIGNMENTS_PER_PAGE: 10,
  TRAINING_FILES_PER_PAGE: 10,
  USERS_PER_PAGE: 10,
  SCHOOLS_PER_PAGE: 10,
  MASTER_DATA_PER_PAGE: 10,
} as const;

export default PAGINATION_CONFIG;
