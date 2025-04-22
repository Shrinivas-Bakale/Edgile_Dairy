# Edgile - University Management System API

## Overview
Edgile is a comprehensive university management system with secure authentication for Admin, Faculty, and Students, real-time messaging, and more planned features.

## Base URL
All API endpoints are relative to: `http://localhost:5000/api/`

## Authentication
Most endpoints require authentication using JWT tokens.

**Headers for authenticated requests:**
```
Authorization: Bearer <your-token>
```

## Student Registration Flow
The student registration process follows these steps:

1. Verify university code:
   ```
   POST /verify-code
   ```
   Body:
   ```json
   {
     "universityCode": "KLE-F104ED",
     "email": "student@example.com",
     "name": "Student Name"
   }
   ```
   Response includes `studentId` and sends OTP to email

2. Complete registration with OTP:
   ```
   POST /student/auth/verify-code
   ```
   Body:
   ```json
   {
     "universityCode": "KLE-F104ED",
     "email": "student@example.com",
     "name": "Student Name",
     "otp": "123456",
     "registerNumber": "STUDENT123",
     "password": "password123",
     "confirmPassword": "password123",
     "phone": "1234567890",
     "division": "A",
     "classYear": "1",
     "semester": "1"
   }
   ```

## API Endpoints

### Authentication

#### Admin Auth
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| POST | `/auth/admin/register` | Register new admin | No |
| POST | `/auth/admin/login` | Admin login | No |
| POST | `/auth/admin/forgot-password` | Request password reset | No |
| POST | `/auth/admin/reset-password` | Reset password with token | No |

#### Faculty Auth
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| POST | `/auth/faculty/register` | Register new faculty | Admin |
| POST | `/auth/faculty/login` | Faculty login | No |
| POST | `/auth/faculty/forgot-password` | Request password reset | No |
| POST | `/auth/faculty/reset-password` | Reset password with token | No |

#### Student Auth
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| POST | `/verify-code` | Verify university code & get OTP | No |
| POST | `/student/auth/verify-code` | Complete registration with OTP | No |
| POST | `/auth/student/login` | Student login | No |
| POST | `/auth/student/verify-email` | Verify email with OTP | No |
| POST | `/auth/student/resend-verification` | Resend verification OTP | No |
| POST | `/auth/student/forgot-password` | Request password reset | No |
| POST | `/auth/student/reset-password` | Reset password with token | No |

### Admin Routes
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| GET | `/admin/profile` | Get admin profile | Admin |
| PUT | `/admin/profile` | Update admin profile | Admin |
| GET | `/admin/stats` | Get university statistics | Admin |
| POST | `/admin/faculty` | Create faculty account | Admin |
| GET | `/admin/faculty` | Get all faculty | Admin |
| POST | `/admin/student` | Create student account | Admin |
| GET | `/admin/student` | Get all students | Admin |

### Faculty Routes
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| GET | `/faculty/all` | Get all faculty | Admin |
| GET | `/faculty/dashboard` | Faculty dashboard data | Faculty |

### Student Routes
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| GET | `/student/profile` | Get student profile | Student |
| PUT | `/student/profile` | Update student profile | Student |
| GET | `/student/dashboard` | Student dashboard data | Student |
| GET | `/student/all` | Get all students | Admin/Faculty |

### Messaging System
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| POST | `/messages` | Create a new message | Any Auth |
| GET | `/messages/:groupId` | Get messages in a group | Group Member |
| GET | `/messages/chats` | Get all user's chats | Any Auth |

### Group Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| POST | `/groups` | Create a new group | Any Auth |
| GET | `/groups` | Get user's groups | Any Auth |
| PUT | `/groups/:id` | Update group | Group Admin |
| DELETE | `/groups/:id` | Delete group | Group Admin |

## Error Handling

All error responses follow this format:
```json
{
  "success": false,
  "message": "Error description here",
  "errors": [{ "field": "fieldName", "msg": "Error message" }] // Optional, for validation errors
}
```

Common HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Server Error

## Rate Limiting
API requests are limited to 100 requests per IP per 15-minute window.

## Development Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create `.env` file with the following variables:
   ```
   NODE_ENV=development
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/edgile
   JWT_SECRET=your_jwt_secret
   EMAIL_SERVICE=gmail
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_email_password
   ```

3. Start development server:
   ```
   npm run dev
   ```

4. For production:
   ```
   npm start
   ```
