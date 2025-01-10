# Quiz Application

This is a comprehensive Quiz Application that allows instructors and students to manage quizzes seamlessly. 
The app includes various features such as creating and managing rooms, viewing leaderboards, uploading test modules, and more.

---

## Features

### For Instructors:
- **Room Management:**
  - Create, activate, and manage quiz rooms.
- **Leaderboard:**
  - View the leaderboard for each quiz.
- **Test Module Management:**
  - Upload test modules and manage existing ones.

### For Students:
- **Attempt Quizzes:**
  - Join active quiz rooms and attempt quizzes.
- **Leaderboard Access:**
  - Check their position on the leaderboard for completed quizzes.

---

## Tech Stack

- **Frontend:** React, Next.js, TailwindCSS
- **Backend:** Node.js, Express.js
- **Database:** MongoDB
- **State Management:** React Hooks
- **Other Libraries:** React-Toastify, Framer Motion

---

## Setup Instructions

### Prerequisites
- Node.js (version 18 or higher)
- MongoDB instance
- Environment variables for backend API URLs.

### Steps
1. Clone the repository:
   ```bash
   git clone https://github.com/CSingh26/quiz-app
   cd quiz-app/frontend
   ```
2. Install Dependencies
    ```bash
    npm install --legacy-peer-deps
    ```
3. Set up environment variables: Create a .env.local file in the root directory and add the following:
    ```bash
    NEXT_PUBLIC_API_BASE_URL=<Your backend API URL>
    ```
4. Run the application:
    ```bash 
    npm run dev
    ```
5. Open the app in your browser:
    ```bash
    http://localhost:3000
    ```
---
### Pages and Features
- **Home Page**: Overview of the application.
- **Instructor Dashboard**:
    - Create Room
    - View Leaderboards
    - Manage Test Modules
- **Student Dashboard**:
    - Join Quiz Room
    - View Past Quizzes
- **Authentication**:
    - Login for both instructors and students.
---
### Development Notes
- Every page has a unique title for better SEO and user experience.
- Modular code structure for easier scalability and maintenance.
- Error handling and notifications implemented using React-Toastify.
---
### License
- This project is licensed under the MIT License.
---
### Acknowledgments
- **Libraries used** : React, TailwindCSS, React-Toastify.
- **Contributors**: Chaitanya Singh