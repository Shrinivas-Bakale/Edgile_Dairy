// Get published timetable for student's class
router.get('/timetable', validateStudent, async (req, res) => {
  try {
    const { year, semester, division, academicYear } = req.query;
    
    if (!year || !semester || !division || !academicYear) {
      return res.status(400).json({
        success: false,
        message: 'Year, semester, division, and academic year are required'
      });
    }
    
    // Find the published timetable for this class
    const timetable = await Timetable.findOne({
      year,
      semester: parseInt(semester),
      division,
      status: 'published'
    });
    
    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'No published timetable found for your class'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: timetable
    });
  } catch (error) {
    logger.error(`Error fetching student timetable: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch timetable'
    });
  }
});

// Get classroom details
router.get('/classroom/:id', validateStudent, async (req, res) => {
  try {
    const classroom = await Classroom.findById(req.params.id);
    
    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: 'Classroom not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: classroom
    });
  } catch (error) {
    logger.error(`Error fetching classroom details: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch classroom details'
    });
  }
});

// Get subjects for a specific year and semester
router.get('/subjects', validateStudent, async (req, res) => {
  try {
    const { year, semester } = req.query;
    
    if (!year || !semester) {
      return res.status(400).json({
        success: false,
        message: 'Year and semester are required'
      });
    }
    
    const subjects = await Subject.find({
      year,
      semester: parseInt(semester)
    });
    
    return res.status(200).json({
      success: true,
      data: subjects
    });
  } catch (error) {
    logger.error(`Error fetching subjects: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch subjects'
    });
  }
});

// Get faculty details by IDs
router.get('/faculty-details', validateStudent, async (req, res) => {
  try {
    const { ids } = req.query;
    
    if (!ids) {
      return res.status(400).json({
        success: false,
        message: 'Faculty IDs are required'
      });
    }
    
    const facultyIds = ids.split(',');
    const faculty = await Faculty.find({
      _id: { $in: facultyIds }
    }).select('name email');
    
    return res.status(200).json({
      success: true,
      data: faculty
    });
  } catch (error) {
    logger.error(`Error fetching faculty details: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch faculty details'
    });
  }
}); 