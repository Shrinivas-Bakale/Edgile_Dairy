const COE = require('../../models/COE');
const logger = require('../../utils/logger');
const fetch = require('node-fetch');

// List all COEs
exports.listCOEs = async (req, res) => {
  try {
    const coes = await COE.find().sort({ startDate: -1 });
    res.json({ success: true, data: coes });
  } catch (error) {
    logger.error('COEController: Error listing COEs:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Create a new COE
exports.createCOE = async (req, res) => {
  try {
    const { name, academicYear, startDate, endDate } = req.body;
    if (!name || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    const coeData = {
      name,
      startDate,
      endDate,
      createdBy: req.user.id,
      events: []
    };
    if (academicYear) coeData.academicYear = academicYear;
    const coe = new COE(coeData);
    await coe.save();
    res.status(201).json({ success: true, data: coe });
  } catch (error) {
    logger.error('COEController: Error creating COE:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get a single COE
exports.getCOE = async (req, res) => {
  try {
    const coe = await COE.findById(req.params.id);
    if (!coe) return res.status(404).json({ success: false, message: 'COE not found' });
    res.json({ success: true, data: coe });
  } catch (error) {
    logger.error('COEController: Error getting COE:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Update a COE (name, period, events)
exports.updateCOE = async (req, res) => {
  try {
    const { name, academicYear, startDate, endDate, events } = req.body;
    const coe = await COE.findById(req.params.id);
    if (!coe) return res.status(404).json({ success: false, message: 'COE not found' });
    if (name) coe.name = name;
    if (academicYear) coe.academicYear = academicYear;
    if (startDate) coe.startDate = startDate;
    if (endDate) coe.endDate = endDate;
    if (Array.isArray(events)) coe.events = events;
    await coe.save();
    res.json({ success: true, data: coe });
  } catch (error) {
    logger.error('COEController: Error updating COE:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Delete a COE
exports.deleteCOE = async (req, res) => {
  try {
    const coe = await COE.findByIdAndDelete(req.params.id);
    if (!coe) return res.status(404).json({ success: false, message: 'COE not found' });
    res.json({ success: true, message: 'COE deleted' });
  } catch (error) {
    logger.error('COEController: Error deleting COE:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Add or update events in a COE (replace all events)
exports.setEventsForCOE = async (req, res) => {
  try {
    const { events } = req.body;
    if (!Array.isArray(events)) return res.status(400).json({ success: false, message: 'Events array required' });
    const coe = await COE.findById(req.params.id);
    if (!coe) return res.status(404).json({ success: false, message: 'COE not found' });
    coe.events = events;
    await coe.save();
    res.json({ success: true, data: coe });
  } catch (error) {
    logger.error('COEController: Error setting events for COE:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Delete a single event from a COE by date/title/type/description
exports.deleteEventFromCOE = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, title, type, description } = req.body;
    const coe = await COE.findById(id);
    if (!coe) return res.status(404).json({ success: false, message: 'COE not found' });
    coe.events = coe.events.filter(ev => !(ev.date === date && ev.title === title && ev.type === type && ev.description === description));
    await coe.save();
    res.json({ success: true, data: coe });
  } catch (error) {
    logger.error('COEController: Error deleting event from COE:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Publish a COE
exports.publishCOE = async (req, res) => {
  try {
    const coe = await COE.findById(req.params.id);
    if (!coe) return res.status(404).json({ success: false, message: 'COE not found' });
    coe.published = true;
    await coe.save();
    res.json({ success: true, data: coe });
  } catch (error) {
    logger.error('COEController: Error publishing COE:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Unpublish a COE
exports.unpublishCOE = async (req, res) => {
  try {
    const coe = await COE.findById(req.params.id);
    if (!coe) return res.status(404).json({ success: false, message: 'COE not found' });
    coe.published = false;
    await coe.save();
    res.json({ success: true, data: coe });
  } catch (error) {
    logger.error('COEController: Error unpublishing COE:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get Indian festivals/holidays for a date using Google Calendar API
// Set GOOGLE_API_KEY in your .env file
exports.getFestivals = async (req, res) => {
  try {
    const { date, start, end } = req.query;
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) return res.status(500).json({ success: false, message: 'Google API key not set' });
    const calendarId = 'en.indian#holiday@group.v.calendar.google.com';
    if (start && end) {
      // Fetch all holidays in the range
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${apiKey}&timeMin=${new Date(start).toISOString()}&timeMax=${new Date(new Date(end).getTime() + 24*60*60*1000).toISOString()}&singleEvents=true&orderBy=startTime`;
      const response = await fetch(url);
      const data = await response.json();
      if (!data.items) return res.json({ success: true, festivals: {} });
      // Map date string to array of festival names
      const festivals = {};
      data.items.forEach(ev => {
        const d = ev.start.date;
        if (!festivals[d]) festivals[d] = [];
        festivals[d].push(ev.summary);
      });
      return res.json({ success: true, festivals });
    }
    // Fallback: single date
    if (!date) return res.status(400).json({ success: false, message: 'Date is required' });
    const timeMin = new Date(date).toISOString();
    const timeMax = new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000).toISOString();
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${apiKey}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;
    const response = await fetch(url);
    const data = await response.json();
    if (!data.items) return res.json({ success: true, festivals: [] });
    const festivals = data.items.map(ev => ev.summary);
    res.json({ success: true, festivals });
  } catch (error) {
    logger.error('COEController: Error fetching festivals from Google:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch festivals', error: error.message });
  }
};

// Public COE view (no auth, only if published)
exports.getPublicCOE = async (req, res) => {
  try {
    const coe = await COE.findById(req.params.id);
    if (!coe || !coe.published) return res.status(404).json({ success: false, message: 'COE not found or not published' });
    res.json({ success: true, data: coe });
  } catch (error) {
    logger.error('COEController: Error getting public COE:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// List all published COEs (for faculty/student dashboards)
exports.listPublishedCOEs = async (req, res) => {
  try {
    const coes = await COE.find({ published: true }).sort({ startDate: -1 });
    res.json({ success: true, data: coes });
  } catch (error) {
    logger.error('COEController: Error listing published COEs:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
}; 