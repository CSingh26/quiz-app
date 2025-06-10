# Quiz Room Application

This is a comprehensive Quiz Application designed to provide seamless quiz management for instructors and students. The app features room creation, leaderboards, test module uploads, and much more.

---

## Features
### For Instructors:
- **Room Management**: Create, activate, and manage quiz rooms.
- **Leaderboard**: View the leaderboard for each quiz.
- **Test Module Management**: Upload test modules and manage existing ones.
### For Students:
- **Attempt Quizzes**: Join active quiz rooms and attempt quizzes.
- **Leaderboard Access**: Check their position on the leaderboard for completed quizzes.

---

## Technologies Used
### Backend:
- **Node.js & Express.js**: Used for building a scalable and efficient server.
- **Prisma ORM**: For database schema definition and seamless interaction with MongoDB.
- **MongoDB**: The primary database for storing application data, including user details, quizzes, and results.
- **AWS SDK**: Utilized for S3 bucket integration to handle file uploads and storage.
- **JWT Authentication**: Securely managing user sessions via JSON Web Tokens.
- **Bcrypt**: Ensuring secure password hashing for user data.
- **Node-Cron**: Scheduling tasks like leaderboard updates or room deactivations.
### Frontend:
- **React & Next.js**: For dynamic and interactive UI, ensuring a smooth user experience.
- **TailwindCSS**: Enables responsive and modern styling for all pages.
- **React-Toastify**: Used for notifications and user feedback.


---
## Processes and Workflow
### Room and Quiz Management:
- Instructors can create rooms using the backend's API.
- Rooms are dynamically activated or deactivated based on their scheduled times.
- Test modules can be uploaded and assigned to specific rooms for quizzes.
### File Uploads:
- Files, such as test modules, are uploaded directly to an AWS S3 bucket and MongoDB using multer and multer-s3.
### Database Management:
- Prisma ORM handles data interaction and schema definitions.
- MongoDB stores all data, including quiz details, user profiles, and room information.
### Authentication and Security:
- JWTs are used for user authentication, ensuring secure access for instructors and students.
- Passwords are securely hashed using Bcrypt for enhanced data security.
### AWS Services:
- **S3 Bucket**: Stores test module files and user-uploaded data.
- **EC2**: Hosts the backend server.
- **Elastic Load Balancer**: Balances incoming traffic to ensure high availability.
- **Route 53**: Manages domain routing.
- **ACM (AWS Certificate Manager)**: Provides SSL for secure communication.
- **Elastic IP**: Static IP for consistent backend access.
### Frontend Hosting:
- **Vercel**: Used for hosting the frontend, enabling continuous integration and deployment for seamless updates.
### Domain Management:
- **Hostinger**: Manages the domain name and related services for the application.
---
### Development Notes
- Modular architecture ensures easy scalability and maintainability.
- Comprehensive error handling is implemented for better debugging and user experience.
- Task scheduling is handled using node-cron, automating periodic updates and maintenance tasks.
---
### License
- This project is licensed under the MIT License.
---
### Acknowledgments
- **Libraries Used**: Prisma, Mongoose, AWS SDK, bcrypt, jsonwebtoken, multer, node-cron, React-Toastify, TailwindCSS.
- **Services Utilized**: AWS (S3, EC2, ACM, Route 53), Vercel, Hostinger.
- **Contributors**: Chaitanya Singh