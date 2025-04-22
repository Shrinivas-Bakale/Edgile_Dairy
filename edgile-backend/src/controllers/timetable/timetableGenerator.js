const mongoose = require('mongoose');
const logger = require('../../utils/logger');
const Timetable = require('../../models/Timetable');
const Subject = require('../../models/Subject');
const Faculty = require('../../models/Faculty');
const FacultyPreference = require('../../models/FacultyPreference');
const ClassroomAssignment = require('../../models/ClassroomAssignment');

/**
 * Generate template timetables for a class
 * @param {Object} params - Parameters for timetable generation
 * @returns {Array} Array of timetable templates
 */
const generateTemplates = async (params) => {
  try {
    const { year, semester, division, classroomId, university, academicYear } = params;
    
    if (!year || !semester || !division || !classroomId || !university) {
      throw new Error('Missing required parameters');
    }
    
    // Fetch subjects for this year and semester
    const subjects = await Subject.find({
      university,
      year,
      semester: parseInt(semester)
    });
    
    if (!subjects || subjects.length === 0) {
      throw new Error('No subjects found for this year and semester');
    }
    
    // Fetch faculty preferences
    const preferences = await FacultyPreference.find({
      university,
      year,
      semester: parseInt(semester),
      academicYear
    }).populate('faculty', 'name email');
    
    // Create default days and time slots
    const days = [
      { day: 'Monday', slots: [] },
      { day: 'Tuesday', slots: [] },
      { day: 'Wednesday', slots: [] },
      { day: 'Thursday', slots: [] },
      { day: 'Friday', slots: [] },
      { day: 'Saturday', slots: [] }
    ];
    
    // Define time slots
    const timeSlots = [
      { startTime: '09:00', endTime: '10:00' },
      { startTime: '10:00', endTime: '11:00' },
      { startTime: '11:15', endTime: '12:15' },
      { startTime: '12:15', endTime: '13:15' },
      { startTime: '14:00', endTime: '15:00' },
      { startTime: '15:00', endTime: '16:00' },
      { startTime: '16:15', endTime: '17:15' }
    ];
    
    // Add time slots to each day
    days.forEach((day, dayIndex) => {
      day.slots = timeSlots.map(slot => ({
        ...slot,
        subjectCode: '',
        facultyId: null
      }));
    });
    
    // Generate three different templates
    const templates = [];
    
    // Template 1: Balanced distribution
    const template1 = {
      year,
      semester: parseInt(semester),
      division,
      classroomId,
      days: JSON.parse(JSON.stringify(days)) // Deep copy
    };
    
    // Template 2: Morning-heavy
    const template2 = {
      year,
      semester: parseInt(semester),
      division,
      classroomId,
      days: JSON.parse(JSON.stringify(days)) // Deep copy
    };
    
    // Template 3: Afternoon-heavy
    const template3 = {
      year,
      semester: parseInt(semester),
      division,
      classroomId,
      days: JSON.parse(JSON.stringify(days)) // Deep copy
    };
    
    // Distribute subjects across templates
    const coreSubjects = subjects.filter(s => s.type === 'Core');
    const labSubjects = subjects.filter(s => s.type === 'Lab');
    const electiveSubjects = subjects.filter(s => s.type === 'Elective');
    
    // Template 1: Balanced distribution
    distributeSubjectsBalanced(template1, coreSubjects, labSubjects, electiveSubjects);
    
    // Template 2: Morning-heavy
    distributeSubjectsMorningHeavy(template2, coreSubjects, labSubjects, electiveSubjects);
    
    // Template 3: Afternoon-heavy
    distributeSubjectsAfternoonHeavy(template3, coreSubjects, labSubjects, electiveSubjects);
    
    templates.push(template1, template2, template3);
    
    return templates;
  } catch (error) {
    logger.error(`Error generating timetable templates: ${error.message}`);
    throw error;
  }
};

/**
 * Distribute subjects in a balanced way across all days
 */
const distributeSubjectsBalanced = (template, coreSubjects, labSubjects, electiveSubjects) => {
  // Distribute core subjects across all days
  coreSubjects.forEach((subject, index) => {
    const dayIndex = index % 5; // Monday to Friday
    const slotIndex = Math.floor(index / 5) % 4; // First 4 slots
    
    template.days[dayIndex].slots[slotIndex].subjectCode = subject.subjectCode;
  });
  
  // Distribute lab subjects (usually longer, so place them in consecutive slots)
  labSubjects.forEach((subject, index) => {
    const dayIndex = index % 5; // Monday to Friday
    // Place labs in the afternoon
    template.days[dayIndex].slots[4].subjectCode = subject.subjectCode;
    template.days[dayIndex].slots[5].subjectCode = subject.subjectCode; // Labs are 2 hours
  });
  
  // Distribute elective subjects
  electiveSubjects.forEach((subject, index) => {
    const dayIndex = (index % 3) + 2; // Wednesday to Friday
    const slotIndex = 6; // Last slot
    
    template.days[dayIndex].slots[slotIndex].subjectCode = subject.subjectCode;
  });
};

/**
 * Distribute subjects with a preference for morning slots
 */
const distributeSubjectsMorningHeavy = (template, coreSubjects, labSubjects, electiveSubjects) => {
  // Place core subjects in morning slots
  coreSubjects.forEach((subject, index) => {
    const dayIndex = index % 5; // Monday to Friday
    const slotIndex = Math.floor(index / 5) % 3; // First 3 slots (morning)
    
    template.days[dayIndex].slots[slotIndex].subjectCode = subject.subjectCode;
  });
  
  // Place labs in mid-day slots
  labSubjects.forEach((subject, index) => {
    const dayIndex = index % 5; // Monday to Friday
    // Place labs in mid-day
    template.days[dayIndex].slots[3].subjectCode = subject.subjectCode;
    template.days[dayIndex].slots[4].subjectCode = subject.subjectCode; // Labs are 2 hours
  });
  
  // Place electives in afternoon
  electiveSubjects.forEach((subject, index) => {
    const dayIndex = (index % 3) + 2; // Wednesday to Friday
    const slotIndex = 5 + (index % 2); // Afternoon slots
    
    template.days[dayIndex].slots[slotIndex].subjectCode = subject.subjectCode;
  });
};

/**
 * Distribute subjects with a preference for afternoon slots
 */
const distributeSubjectsAfternoonHeavy = (template, coreSubjects, labSubjects, electiveSubjects) => {
  // Place core subjects in afternoon slots
  coreSubjects.forEach((subject, index) => {
    const dayIndex = index % 5; // Monday to Friday
    const slotIndex = 4 + (Math.floor(index / 5) % 3); // Last 3 slots (afternoon)
    
    template.days[dayIndex].slots[slotIndex].subjectCode = subject.subjectCode;
  });
  
  // Place labs in morning
  labSubjects.forEach((subject, index) => {
    const dayIndex = index % 5; // Monday to Friday
    // Place labs in morning
    template.days[dayIndex].slots[0].subjectCode = subject.subjectCode;
    template.days[dayIndex].slots[1].subjectCode = subject.subjectCode; // Labs are 2 hours
  });
  
  // Place electives in mid-day
  electiveSubjects.forEach((subject, index) => {
    const dayIndex = (index % 3); // Monday to Wednesday
    const slotIndex = 2 + (index % 2); // Mid-day slots
    
    template.days[dayIndex].slots[slotIndex].subjectCode = subject.subjectCode;
  });
};

/**
 * Create a new timetable from a template
 * @param {Object} params - Parameters for timetable creation
 * @returns {Object} Created timetable
 */
const createTimetable = async (params) => {
  try {
    const { 
      template, 
      createdBy, 
      assignFaculty = false,
      university,
      academicYear
    } = params;
    
    if (!template || !createdBy) {
      throw new Error('Missing required parameters');
    }
    
    // If assignFaculty is true, assign faculty based on preferences
    if (assignFaculty) {
      await assignFacultyToSlots(template, university, academicYear);
    }
    
    // Create the timetable
    const timetable = new Timetable({
      ...template,
      status: 'draft',
      createdBy,
      history: [{
        action: 'Created',
        changedBy: createdBy,
        details: { message: 'Timetable created from template' }
      }]
    });
    
    await timetable.save();
    
    return timetable;
  } catch (error) {
    logger.error(`Error creating timetable: ${error.message}`);
    throw error;
  }
};

/**
 * Assign faculty to timetable slots based on preferences
 */
const assignFacultyToSlots = async (template, university, academicYear) => {
  try {
    // Get all faculty preferences for this class configuration
    const preferences = await FacultyPreference.find({
      university,
      year: template.year,
      semester: template.semester,
      academicYear
    }).populate('faculty', 'name email _id');
    
    // Group preferences by subject
    const subjectPreferences = preferences.reduce((acc, pref) => {
      if (!acc[pref.subjectCode]) {
        acc[pref.subjectCode] = [];
      }
      acc[pref.subjectCode].push(pref);
      return acc;
    }, {});
    
    // Keep track of faculty assignments to avoid conflicts
    const facultyAssignments = {};
    
    // Go through each day and slot
    template.days.forEach((day, dayIndex) => {
      day.slots.forEach((slot, slotIndex) => {
        if (slot.subjectCode) {
          const subjectCode = slot.subjectCode;
          const prefList = subjectPreferences[subjectCode] || [];
          
          // Try to find a faculty without a conflict at this time
          const availableFaculty = prefList.find(pref => {
            const facultyId = pref.faculty._id.toString();
            const timeKey = `${day.day}-${slot.startTime}`;
            
            // Check if this faculty is already assigned to another subject at this time
            return !facultyAssignments[timeKey]?.includes(facultyId);
          });
          
          if (availableFaculty) {
            // Assign the faculty to this slot
            slot.facultyId = availableFaculty.faculty._id;
            
            // Mark this faculty as assigned for this time slot
            const timeKey = `${day.day}-${slot.startTime}`;
            if (!facultyAssignments[timeKey]) {
              facultyAssignments[timeKey] = [];
            }
            facultyAssignments[timeKey].push(availableFaculty.faculty._id.toString());
          }
        }
      });
    });
  } catch (error) {
    logger.error(`Error assigning faculty to slots: ${error.message}`);
    throw error;
  }
};

/**
 * Check timetable for conflicts (faculty assigned to multiple classes at the same time)
 */
const checkConflicts = (timetable) => {
  const conflicts = [];
  const facultyAssignments = {};
  
  // Check for faculty conflicts
  timetable.days.forEach((day, dayIndex) => {
    day.slots.forEach((slot, slotIndex) => {
      if (slot.facultyId) {
        const timeKey = `${day.day}-${slot.startTime}`;
        const facultyId = slot.facultyId.toString();
        
        if (!facultyAssignments[timeKey]) {
          facultyAssignments[timeKey] = [];
        }
        
        if (facultyAssignments[timeKey].includes(facultyId)) {
          // Conflict found
          conflicts.push({
            type: 'Faculty',
            day: day.day,
            time: slot.startTime,
            subjectCode: slot.subjectCode,
            facultyId: facultyId,
            message: 'Faculty assigned to multiple classes at the same time'
          });
        } else {
          facultyAssignments[timeKey].push(facultyId);
        }
      }
    });
  });
  
  // Check for subject conflicts (same subject scheduled multiple times in a day)
  timetable.days.forEach((day) => {
    const subjectCounts = {};
    
    day.slots.forEach((slot) => {
      if (slot.subjectCode) {
        const subjectCode = slot.subjectCode;
        subjectCounts[subjectCode] = (subjectCounts[subjectCode] || 0) + 1;
      }
    });
    
    // Check for labs (which should be in consecutive slots)
    Object.entries(subjectCounts).forEach(([subjectCode, count]) => {
      // If a subject appears only once, check if it's a lab (which should be at least 2 hours)
      if (count === 1) {
        // Find the subject to check if it's a lab
        const isLabScheduledCorrectly = day.slots.some((slot, index) => {
          if (slot.subjectCode === subjectCode && index < day.slots.length - 1) {
            return day.slots[index + 1].subjectCode === subjectCode;
          }
          return false;
        });
        
        // If it's not scheduled correctly, add a conflict
        if (!isLabScheduledCorrectly) {
          conflicts.push({
            type: 'Subject',
            day: day.day,
            subjectCode: subjectCode,
            message: 'Lab subject should be scheduled in consecutive slots'
          });
        }
      }
    });
  });
  
  return conflicts;
};

/**
 * Publish a timetable (change status from draft to published)
 */
const publishTimetable = async (timetableId, adminId) => {
  try {
    const timetable = await Timetable.findById(timetableId);
    
    if (!timetable) {
      throw new Error('Timetable not found');
    }
    
    // Check for conflicts before publishing
    const conflicts = checkConflicts(timetable);
    
    if (conflicts.length > 0) {
      return {
        success: false,
        conflicts
      };
    }
    
    // Update the status and add a history entry
    timetable.status = 'published';
    timetable.addHistoryEntry('Published', adminId, { message: 'Timetable published' });
    
    await timetable.save();
    
    return {
      success: true,
      timetable
    };
  } catch (error) {
    logger.error(`Error publishing timetable: ${error.message}`);
    throw error;
  }
};

module.exports = {
  generateTemplates,
  createTimetable,
  assignFacultyToSlots,
  checkConflicts,
  publishTimetable
}; 