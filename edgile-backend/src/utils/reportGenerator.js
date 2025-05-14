/**
 * Simplified mock report generator that returns a URL without actually generating a PDF
 */

const path = require('path');
const fs = require('fs');

/**
 * Generate a mock attendance report and return a URL to access it
 */
exports.generateAttendanceReport = async (options) => {
  try {
    const { 
      classId, 
      subjectId, 
      studentId, 
      startDate, 
      endDate, 
      reportType = 'summary',
      facultyId,
      universityId
    } = options;
    
    // In a real implementation, we would use actual data to generate a PDF
    // For now, we'll just return a mock URL
    
    // Generate a unique filename based on parameters
    const timestamp = new Date().getTime();
    const filename = `attendance_${reportType}_${timestamp}.pdf`;
    
    // Mock report URL (this would be where a real report would be stored)
    const reportUrl = `/static/reports/${filename}`;
    
    console.log(`Mock report generated: ${reportUrl}`);
    console.log('Report parameters:', options);
    
    // Write log entry to verify this was called
    const logDir = path.join(__dirname, '../../logs');
    
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      reportType,
      classId,
      subjectId,
      studentId,
      dateRange: {
        start: startDate,
        end: endDate
      },
      requestedBy: facultyId,
      university: universityId,
      reportUrl
    };
    
    // Append to log file
    fs.appendFileSync(
      path.join(logDir, 'report-generation.log'), 
      JSON.stringify(logEntry) + '\n'
    );
    
    return {
      reportUrl,
      reportType,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error generating report:', error);
    throw error;
  }
};

/**
 * Get a list of generated reports for a given class
 */
exports.getGeneratedReports = async (classId) => {
  // Mock response
  return [
    {
      reportUrl: '/static/reports/attendance_summary_123456789.pdf',
      reportType: 'summary',
      generatedAt: new Date().toISOString()
    }
  ];
}; 