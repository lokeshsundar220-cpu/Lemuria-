# 🏨 LEMURIA — Hotel Management System

LEMURIA is a modern hotel management platform designed to streamline hotel operations and elevate guest experiences. The system connects separate, feature-rich Guest and Staff portals through a centralized RESTful API and a MongoDB database. It provides real-time task management, digital stay services, and role-based staff operations for multi-property luxury hospitality environments.

---

## ✨ Features

### Guest Portal
- **User Registration & Login**: Account creation with password and OTP verification.
- **Browse Hotels & Rooms**: Search available hotels, room categories, pricing, and amenities.
- **Room Booking**: Calendar date-range selection with live availability checking.
- **Booking Management**: View reservation history, active stay details, and booking codes.
- **Check-In & Checkout Flow**: Digital check-in request and keycard PIN access unlock upon approval.
- **Hotel Service Requests**: Submit on-demand requests for Housekeeping, Maintenance, and Food & Beverage.
- **Emergency Requests**: Instant high-priority alert system for urgent guest assistance.
- **Notifications**: Real-time status updates on orders, stay requests, and announcements.
- **Feedback**: Submit ratings and reviews for overall stay and individual departments.

### Staff Portal
- **Staff Login & Role-Based Access**: Secure login with departmental permissions (`MANAGER`, `RECEPTION`, `HOUSEKEEPING`, `MAINTENANCE`, `FOOD_AND_BEVERAGE`).
- **Manager Staff Management**: Add staff members, update employee records, and manage account statuses.
- **Duty Management**: Toggle shift states (`ON_DUTY` / `OFF_DUTY`) and availability status.
- **Task Management**: Real-time task offers with accept/decline flows and automatic re-dispatching.
- **Housekeeping Operations**: Automated room turnover tasks upon guest checkout and cleaning queue tracking.
- **Maintenance Operations**: Track and resolve facility repairs, climate control issues, and maintenance tickets.
- **Food & Beverage Operations**: Process in-room dining orders and departmental service requests.
- **Reception Operations**: Manage guest arrivals, verify identity, and approve digital check-ins and check-outs.
- **Emergency Handling**: Real-time broadcast alerts with acknowledgement and resolution tracking.
- **Notifications**: Operational updates, task dispatches, and emergency alerts.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Guest Portal** | React, TypeScript, Vite |
| **Staff Portal** | React, TypeScript, Vite |
| **Backend** | Node.js, Express |
| **Database** | MongoDB |
| **Authentication** | JWT & OTP |
| **API** | REST API |

---

## 📁 Project Structure

```text
LEMURIA/
├── BACKEND/
├── GUEST PORTAL/
├── STAFF PORTAL/
├── README.md
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [MongoDB](https://www.mongodb.com/) (Local instance or MongoDB Atlas)

### 1. Backend Setup
```bash
cd BACKEND
npm install
npm run dev
```

### 2. Guest Portal Setup
```bash
cd "GUEST PORTAL"
npm install
npm run dev
```

### 3. Staff Portal Setup
```bash
cd "STAFF PORTAL"
npm install
npm run dev
```