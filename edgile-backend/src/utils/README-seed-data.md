# Test Data Seeder

This utility adds test data to the Edgile application database for development and testing purposes.

## What it adds

1. **Students**:
   - 3-4 students per division (A1-A6)
   - For each year (1, 2, 3)
   - For odd semesters (1, 3, 5)
   - Total: ~60 student accounts

2. **Faculty**:
   - 16 faculty members across different departments
   - With different qualifications and subjects
   - All in "active" status

3. **Registration Codes**:
   - 5 unused faculty registration codes for testing faculty registration

## Prerequisites

Before running this script:
1. Ensure you have a MongoDB connection
2. Make sure there is at least one admin/university account in the database

## How to use

### Running the seed script

```bash
# From the project root
npm run seed
```

### Test user credentials

All seeded users (both students and faculty) have the same password:
- Password: `Test@123`

### Example Student Accounts:
- Email: student1@klebcahubli.in (Year 1, Division A1)
- Email: student10@klebcahubli.in (Year 1, Division A3)
- Email: student25@klebcahubli.in (Year 2, Division A2)
- Email: student45@klebcahubli.in (Year 3, Division A3)

### Example Faculty Accounts:
- Email: faculty1@klebcahubli.in (Computer Science)
- Email: faculty5@klebcahubli.in (Mechanical Engineering)
- Email: faculty10@klebcahubli.in (Mathematics)

## Notes

- The script will not run if there are already students or faculty in the database
- To re-seed, you need to drop the existing collections first
- All users are created with "active" status and are verified

## Data Details

### Student Data Format
```javascript
{
  registerNumber: "REG1A101", // Format: REG{year}{division}{number}
  name: "Student 1",
  email: "student1@klebcahubli.in",
  password: "hashed_password",
  phone: "9876500001",
  classYear: 1,
  semester: 1,
  division: "A1",
  university: adminId,
  universityCode: "UNIV-123",
  role: "student",
  status: "active",
  isVerified: true
}
```

### Faculty Data Format
```javascript
{
  name: "Faculty 1",
  email: "faculty1@klebcahubli.in",
  password: "hashed_password",
  universityCode: "UNIV-123",
  universityName: "KLE BCA Hubli",
  university: adminId,
  department: "Computer Science",
  employeeId: "EMP101",
  role: "faculty",
  status: "active",
  subjects: ["Data Structures", "Algorithms", "Database Systems"],
  isVerified: true,
  phone: "9876543201"
}
``` 