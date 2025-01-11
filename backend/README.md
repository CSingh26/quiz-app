# Quiz Application

This is a comprehensive Quiz Application that allows instructors and students to manage quizzes seamlessly. 
The app includes various features such as creating and managing rooms, viewing leaderboards, uploading test modules, and more.

---

## Features
### For Instructors:
- **Room Management**:
    - Create, activate, and manage quiz rooms.
- **Leaderboard**:
    - View the leaderboard for each quiz.
- **Test Module Management**:
    - Upload test modules and manage existing ones.
### For Students:
- **Attempt Quizzes**:
    - Join active quiz rooms and attempt quizzes.
- **Leaderboard Access**:
    - Check their position on the leaderboard for completed quizzes.

---

## Tech Stack
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Database Management**: Prisma ORM
- **Other Important Libraries**:
    - **@prisma/client**: Prisma client for database operations.
    - **Mongoose**: MongoDB ODM for schema management.
    - **bcrypt**: For password hashing and security.
    - **jsonwebtoken**: For authentication via JWTs.
    - **dotenv**: For environment variable management.
    - **multer and multer-s3**: For file uploads.
    - **AWS SDK**: For S3 storage and file handling.
    - **node-cron**: For scheduling tasks.

---

## Setup Instructions

### Prerequisites
- Node.js (version 18 or higher)
- MongoDB instance
- AWS account for S3 storage (optional for file uploads)

### Steps
1. Clone the repository:
   ```bash
   git clone https://github.com/CSingh26/quiz-app
   cd quiz-app/backend
   ```
2. Install Dependencies
    ```bash
    npm install
    ```
3. Set up environment variables: Create a .env.local file in the root directory and add the following:
    ```bash
    JWT_KEY = <Your JWT Secret Key>
APP_KEY = <App Secret Key>
PORT = 6573
MONGO_USERNAME = <MongoDB Username>
MONGO_PWD = <MongoDB Password>
MONGO_URL = <MongoDB Connection URL>
ADMIN_USERNAME = <Admin Username>
ADMIN_PWD = <Admin Password>
NODE_ENV = production
DATABASE_URL = <MongoDB Full Connection URL>
AWS_ACCESS_KEY = <AWS Access Key>
AWS_SECRET_ACCESS_KEY = <AWS Secret Access Key>
AWS_REGION_NAME = <AWS Region>
AWS_BUCKET_NAME = <AWS S3 Bucket Name>
DEFAULT_AVATAR_URL = <URL for Default Avatar>
DEFAULT_BACKGROUND_URL = <URL for Default Background>
    ```
4. Generate Primsa Client
    ```bash
    npx prisma generate
    ```
5. Push Database to MonogoDB Client
    ```bash
    npx prisma db push
    ```
6. Run the application:
    ```bash 
    npm run dev
    ```
---
### Pages and Features
- **Instructor Dashboard**:
    - **Create Room**: Manage quiz rooms efficiently.
    - **View Leaderboards**: Track quiz results in real-time.
    - **Manage Test Modules**: Upload and maintain test modules.
- **Student Dashboard**:
    - **Join Quiz Room**: Enter room codes to join active quizzes.
    - **View Past Quizzes**: Keep track of completed quizzes.
- **Authentication**:
    - Login for both instructors and students.
---
### Development Notes
- **Code Structure**: Modular architecture ensures scalability and maintainability.
- **Error Handling**: Comprehensive error handling using middleware and libraries like jsonwebtoken.
- **Environment Management**: Secure API and database integration with .env variables.

---
### License
- This project is licensed under the MIT License.
---
### Acknowledgments
- **Libraries used** : Prisma, Mongoose, AWS SDK, bcrypt, jsonwebtoken, multer, node-cron.
- **Contributors**: Chaitanya Singh