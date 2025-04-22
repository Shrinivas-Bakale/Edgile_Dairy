// Mock API responses for development and testing

export const mockClassrooms = [
  { _id: "c1", name: "Avira", capacity: 60, building: "Main Building", floor: 2 },
  { _id: "c2", name: "Nexus", capacity: 45, building: "Main Building", floor: 1 },
  { _id: "c3", name: "Quantum Hall", capacity: 80, building: "Science Block", floor: 3 },
  { _id: "c4", name: "Pinnacle Lab", capacity: 30, building: "Science Block", floor: 2 }
];

export const mockSubjects = [
  { 
    _id: "s1", 
    code: "CSE101", 
    name: "Introduction to Computer Science", 
    creditHours: 4,
    type: "Theory",
    color: "blue"
  },
  { 
    _id: "s2", 
    code: "CSE102", 
    name: "Programming Fundamentals", 
    creditHours: 4,
    type: "Theory",
    color: "green"
  },
  { 
    _id: "s3", 
    code: "CSE103", 
    name: "Data Structures", 
    creditHours: 3,
    type: "Theory",
    color: "red"
  },
  { 
    _id: "s4", 
    code: "CSE104", 
    name: "Computer Organization", 
    creditHours: 3,
    type: "Theory",
    color: "purple"
  },
  { 
    _id: "s5", 
    code: "CSE105", 
    name: "Programming Lab", 
    creditHours: 2,
    type: "Lab",
    color: "cyan"
  },
  { 
    _id: "s6", 
    code: "CSE106", 
    name: "Data Structures Lab", 
    creditHours: 2,
    type: "Lab",
    color: "orange"
  }
];

export const mockFaculty = [
  { _id: "f1", name: "Dr. John Smith", email: "john.smith@example.com" },
  { _id: "f2", name: "Prof. Sarah Johnson", email: "sarah.johnson@example.com" },
  { _id: "f3", name: "Dr. Robert Williams", email: "robert.williams@example.com" },
  { _id: "f4", name: "Prof. Emily Brown", email: "emily.brown@example.com" },
  { _id: "f5", name: "Dr. Michael Davis", email: "michael.davis@example.com" }
];

export const mockTimetableTemplates = [
  {
    _id: "template1",
    name: "Balanced Distribution",
    description: "Evenly distributes classes throughout the week",
    days: [
      {
        day: "Monday",
        slots: [
          { time: "9:00 AM - 10:00 AM", subjectCode: "CSE101", facultyId: null },
          { time: "10:00 AM - 11:00 AM", subjectCode: "CSE102", facultyId: null },
          { time: "11:00 AM - 12:00 PM", subjectCode: "CSE103", facultyId: null },
          { time: "1:00 PM - 2:00 PM", subjectCode: "CSE104", facultyId: null }
        ]
      },
      {
        day: "Tuesday",
        slots: [
          { time: "9:00 AM - 10:00 AM", subjectCode: "CSE101", facultyId: null },
          { time: "10:00 AM - 12:00 PM", subjectCode: "CSE105", facultyId: null },
          { time: "1:00 PM - 2:00 PM", subjectCode: "CSE103", facultyId: null }
        ]
      },
      {
        day: "Wednesday",
        slots: [
          { time: "9:00 AM - 10:00 AM", subjectCode: "CSE104", facultyId: null },
          { time: "10:00 AM - 11:00 AM", subjectCode: "CSE102", facultyId: null },
          { time: "11:00 AM - 1:00 PM", subjectCode: "CSE106", facultyId: null }
        ]
      },
      {
        day: "Thursday",
        slots: [
          { time: "9:00 AM - 10:00 AM", subjectCode: "CSE103", facultyId: null },
          { time: "10:00 AM - 11:00 AM", subjectCode: "CSE101", facultyId: null },
          { time: "11:00 AM - 12:00 PM", subjectCode: "CSE104", facultyId: null },
          { time: "1:00 PM - 2:00 PM", subjectCode: "CSE102", facultyId: null }
        ]
      },
      {
        day: "Friday",
        slots: [
          { time: "9:00 AM - 10:00 AM", subjectCode: "CSE102", facultyId: null },
          { time: "10:00 AM - 11:00 AM", subjectCode: "CSE101", facultyId: null },
          { time: "11:00 AM - 12:00 PM", subjectCode: "CSE103", facultyId: null }
        ]
      }
    ]
  },
  {
    _id: "template2",
    name: "Morning Heavy",
    description: "More classes scheduled in the morning",
    days: [
      {
        day: "Monday",
        slots: [
          { time: "8:00 AM - 9:00 AM", subjectCode: "CSE101", facultyId: null },
          { time: "9:00 AM - 10:00 AM", subjectCode: "CSE102", facultyId: null },
          { time: "10:00 AM - 11:00 AM", subjectCode: "CSE103", facultyId: null },
          { time: "11:00 AM - 1:00 PM", subjectCode: "CSE105", facultyId: null }
        ]
      },
      {
        day: "Tuesday",
        slots: [
          { time: "8:00 AM - 9:00 AM", subjectCode: "CSE104", facultyId: null },
          { time: "9:00 AM - 10:00 AM", subjectCode: "CSE101", facultyId: null },
          { time: "10:00 AM - 11:00 AM", subjectCode: "CSE102", facultyId: null }
        ]
      },
      {
        day: "Wednesday",
        slots: [
          { time: "8:00 AM - 9:00 AM", subjectCode: "CSE103", facultyId: null },
          { time: "9:00 AM - 10:00 AM", subjectCode: "CSE104", facultyId: null },
          { time: "10:00 AM - 12:00 PM", subjectCode: "CSE106", facultyId: null }
        ]
      },
      {
        day: "Thursday",
        slots: [
          { time: "8:00 AM - 9:00 AM", subjectCode: "CSE101", facultyId: null },
          { time: "9:00 AM - 10:00 AM", subjectCode: "CSE102", facultyId: null },
          { time: "10:00 AM - 11:00 AM", subjectCode: "CSE103", facultyId: null }
        ]
      },
      {
        day: "Friday",
        slots: [
          { time: "8:00 AM - 9:00 AM", subjectCode: "CSE104", facultyId: null },
          { time: "9:00 AM - 10:00 AM", subjectCode: "CSE101", facultyId: null },
          { time: "10:00 AM - 11:00 AM", subjectCode: "CSE102", facultyId: null }
        ]
      }
    ]
  },
  {
    _id: "template3",
    name: "Afternoon Heavy",
    description: "More classes scheduled in the afternoon",
    days: [
      {
        day: "Monday",
        slots: [
          { time: "1:00 PM - 2:00 PM", subjectCode: "CSE101", facultyId: null },
          { time: "2:00 PM - 3:00 PM", subjectCode: "CSE102", facultyId: null },
          { time: "3:00 PM - 4:00 PM", subjectCode: "CSE103", facultyId: null }
        ]
      },
      {
        day: "Tuesday",
        slots: [
          { time: "1:00 PM - 2:00 PM", subjectCode: "CSE104", facultyId: null },
          { time: "2:00 PM - 4:00 PM", subjectCode: "CSE105", facultyId: null }
        ]
      },
      {
        day: "Wednesday",
        slots: [
          { time: "1:00 PM - 2:00 PM", subjectCode: "CSE101", facultyId: null },
          { time: "2:00 PM - 3:00 PM", subjectCode: "CSE102", facultyId: null },
          { time: "3:00 PM - 4:00 PM", subjectCode: "CSE103", facultyId: null }
        ]
      },
      {
        day: "Thursday",
        slots: [
          { time: "1:00 PM - 2:00 PM", subjectCode: "CSE104", facultyId: null },
          { time: "2:00 PM - 4:00 PM", subjectCode: "CSE106", facultyId: null }
        ]
      },
      {
        day: "Friday",
        slots: [
          { time: "1:00 PM - 2:00 PM", subjectCode: "CSE101", facultyId: null },
          { time: "2:00 PM - 3:00 PM", subjectCode: "CSE102", facultyId: null },
          { time: "3:00 PM - 4:00 PM", subjectCode: "CSE103", facultyId: null }
        ]
      }
    ]
  }
]; 