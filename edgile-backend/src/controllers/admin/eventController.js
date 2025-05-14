const Event = require('../../models/Event');
const logger = require('../../utils/logger');

// List all events
exports.listEvents = async (req, res) => {
  logger.info('EventController: Listing all events');
  try {
    const events = await Event.find().sort({ date: 1 });
    logger.info(`EventController: Found ${events.length} events`);
    res.json({ success: true, data: events });
  } catch (error) {
    logger.error('EventController: Error listing events:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Create a new event
exports.createEvent = async (req, res) => {
  logger.info('EventController: Creating new event', { body: req.body });
  try {
    const { title, date, type, description } = req.body;
    if (!title || !date || !type) {
      logger.warn('EventController: Missing required fields');
      return res.status(400).json({ success: false, message: 'Title, date, and type are required' });
    }
    const event = new Event({
      title,
      date,
      type,
      description,
      createdBy: req.user.id
    });
    await event.save();
    logger.info('EventController: Event created successfully', { eventId: event._id });
    res.status(201).json({ success: true, data: event });
  } catch (error) {
    logger.error('EventController: Error creating event:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Update an event
exports.updateEvent = async (req, res) => {
  logger.info('EventController: Updating event', { id: req.params.id, body: req.body });
  try {
    const { id } = req.params;
    const { title, date, type, description, published } = req.body;
    const event = await Event.findById(id);
    if (!event) {
      logger.warn('EventController: Event not found', { id });
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    event.title = title ?? event.title;
    event.date = date ?? event.date;
    event.type = type ?? event.type;
    event.description = description ?? event.description;
    if (typeof published === 'boolean') event.published = published;
    event.updatedBy = req.user.id;
    await event.save();
    logger.info('EventController: Event updated successfully', { eventId: event._id });
    res.json({ success: true, data: event });
  } catch (error) {
    logger.error('EventController: Error updating event:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Delete an event
exports.deleteEvent = async (req, res) => {
  logger.info('EventController: Deleting event', { id: req.params.id });
  try {
    const { id } = req.params;
    const event = await Event.findByIdAndDelete(id);
    if (!event) {
      logger.warn('EventController: Event not found for deletion', { id });
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    logger.info('EventController: Event deleted successfully', { id });
    res.json({ success: true, message: 'Event deleted' });
  } catch (error) {
    logger.error('EventController: Error deleting event:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Publish/unpublish event
exports.setPublishState = async (req, res) => {
  logger.info('EventController: Setting publish state', { id: req.params.id, published: req.body.published });
  try {
    const { id } = req.params;
    const { published } = req.body;
    const event = await Event.findById(id);
    if (!event) {
      logger.warn('EventController: Event not found for publish state change', { id });
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    event.published = !!published;
    event.updatedBy = req.user.id;
    await event.save();
    logger.info('EventController: Event publish state updated', { id, published: event.published });
    res.json({ success: true, data: event });
  } catch (error) {
    logger.error('EventController: Error updating publish state:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Download events as CSV (placeholder)
exports.downloadEvents = async (req, res) => {
  logger.info('EventController: Downloading events');
  try {
    const events = await Event.find().sort({ date: 1 });
    logger.info(`EventController: Found ${events.length} events for download`);
    // TODO: Convert events to CSV and send as attachment
    res.status(501).json({ success: false, message: 'Download not implemented yet' });
  } catch (error) {
    logger.error('EventController: Error downloading events:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
}; 