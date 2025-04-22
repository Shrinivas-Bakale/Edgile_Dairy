/**
 * Calculates the current academic year in the format YYYY-YY
 * Academic year starts in July and ends in June of the next year
 * @returns {string} Academic year in format YYYY-YY (e.g., "2023-24")
 */
function getCurrentAcademicYear() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const month = today.getMonth() + 1; // 1-12
  
  let startYear;
  // Academic year starts in July
  if (month >= 7) { // July onwards - new academic year
    startYear = currentYear;
  } else {
    startYear = currentYear - 1;
  }
  
  const endYear = (startYear + 1) % 100;
  return `${startYear}-${String(endYear).padStart(2, '0')}`;
}

/**
 * Validates if a string is in the correct academic year format (YYYY-YY)
 * @param {string} academicYear - Academic year to validate
 * @returns {boolean} True if valid format, false otherwise
 */
function isValidAcademicYear(academicYear) {
  if (!academicYear) return false;
  const regex = /^\d{4}-\d{2}$/;
  if (!regex.test(academicYear)) return false;
  
  const [startYear, endYear] = academicYear.split('-');
  const expectedEndYear = (parseInt(startYear) + 1) % 100;
  const formattedEndYear = String(expectedEndYear).padStart(2, '0');
  
  return endYear === formattedEndYear;
}

module.exports = {
  getCurrentAcademicYear,
  isValidAcademicYear
}; 