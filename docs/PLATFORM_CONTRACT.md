# Platform implementation contract

All JSON endpoints below live under `/api/v2`. Errors: `{error:{code,message}}`; unknown keys rejected for mutations. Dates use ISO strings. Arrays are bounded; lists at most 100 records. Auth cookie is `quizbee_session`. Mutations require the configured browser `APP_ORIGIN`; the same-origin web proxy preserves the original Origin. User object `{id,name,email,role}`; role `STUDENT|INSTRUCTOR|ADMIN`. Registration role may be STUDENT or INSTRUCTOR (self-service instructor, authority remains scoped to owned courses/quizzes).

## Question and quiz

Question: `{id,type,prompt,choices:[{id,text}],correctAnswer,explanation,difficulty,topic,points,sourceRefs:[],tags:[]}`. Types `single_choice|multiple_select|true_false|short_answer|numeric|fill_blank|matching|ordering|essay`. Answer is string, number, string[] or string-to-string record depending on type; absent is unanswered. CorrectAnswer same union. Numeric `tolerance` optional. Difficulty `easy|medium|hard`. Source refs `{chunkId,label,quote}`. IDs bounded safe strings. Settings `{durationMinutes:number|null,shuffleQuestions:boolean,shuffleOptions:boolean,mode:'practice'|'exam',showExplanations:boolean}`. Builder can start with single_choice/true_false/short_answer/numeric/essay; full engine accepts all types.

Quiz summary: `{id,title,description,mode,questionCount,createdAt,updatedAt,latestVersion:number}`. Quiz detail adds `{questions,settings}` for owner only. Create/edit body `{title,description,questions,settings}`. Each save creates immutable numbered QuizVersion. API never sends correct answers in an active Attempt view.

## Endpoints

- POST `/auth/register` `{name,email,password,role}`; POST `/auth/login` `{email,password}` => `{user}` plus cookie. GET `/auth/me` => `{user}`. POST `/auth/logout` => `{ok:true}`.
- GET `/dashboard` => `{quizzes:QuizSummary[],attempts:AttemptSummary[],courses:Course[],stats:{completed,averageScore,studyMinutes},topics:[{topic,correct,total}]}`.
- GET `/quizzes` => `{quizzes}`; POST `/quizzes` => `{quiz}`; GET/PUT/DELETE `/quizzes/:id` => `{quiz}` or `{ok:true}`.
- POST `/quizzes/:id/start` `{assignmentId?:string,accessCode?:string}` => `{attempt}`. A quiz owner may start private practice. Assignment participant uses same endpoint with assignmentId. Resume existing in-progress attempt before allocating a new one.
- GET `/attempts/:id` => `{attempt}`; PUT `/attempts/:id/answers` `{answers,revision,flagged?:string[]}` => `{attempt}`; POST `/attempts/:id/submit` `{}` => `{attempt}`; POST `/attempts/:id/events` `{type:'visibility_hidden'|'focus_lost'|'fullscreen_exit'|'copy'|'paste'}` => `{ok:true}` only if assignment integrity signals enabled.
- Attempt view `{id,quizId,title,status:'in_progress'|'submitted'|'expired',mode,questions,answers,flagged,revision,startedAt,expiresAt,serverNow,score:number|null,maxScore,percentage:number|null,submittedAt:string|null,review?:[{questionId,prompt,answer,correctAnswer,explanation,topic,earned,points,sourceRefs}],allowBacktracking:boolean,integrityEnabled:boolean}`. Presented questions exclude correctAnswer/explanation/sourceRefs until review release. Submitted essay grades explicitly pending review.
- GET `/materials` => `{materials:[{id,name,type,size,status,createdAt,error?,chunkCount}]}`; POST `/materials` multipart `file` => `{material}`; DELETE `/materials/:id` => `{ok:true}`; GET `/materials/:id/chunks` => `{chunks:[{id,text,label}]}`.
- GET `/generation/config` => `{configured:boolean,provider:string|null}`; POST `/generation` `{materialIds:string[],title,questionCount,difficulty:'easy'|'medium'|'hard'|'mixed',questionTypes:string[],durationMinutes:number|null,topics?:string}` => `{job:{id,status}}`; GET `/jobs/:id` => `{job:{id,status,progress,error,resultQuizId}}`.
- GET/POST `/courses` => `{courses}` or `{course}`. Create `{name,description}`. Course `{id,name,description,code,memberCount,createdAt}`. POST `/courses/join` `{code}`. GET `/courses/:id` => `{course,members:[{id,name,email}],assignments:Assignment[]}` (member roster only owner).
- POST `/courses/:id/assignments` `{quizId,title,startsAt,endsAt,durationMinutes,attemptLimit,accessCode?:string,allowBacktracking:boolean,integrityEnabled:boolean}` => `{assignment}`. Assignment `{id,quizId,title,startsAt,endsAt,durationMinutes,attemptLimit,allowBacktracking,integrityEnabled,questionCount}`; GET `/assignments` => `{assignments}` includes course name. GET `/courses/:id/results` => `{results:[{attemptId,studentName,title,score,maxScore,percentage,status,submittedAt,integrityCount}]}`; same + `?format=csv` exports results with formula injection protection.
- GET `/sessions` => `{sessions:[{id,createdAt,expiresAt,current}]}`; DELETE `/sessions/:id` revokes owned session; DELETE `/account` deletes owned data/session after `{password}` verification.

## Database fields (agent-owned schema)

User id/name/email(unique)/passwordHash/role/createdAt. Session id/tokenHash(unique)/userId/expiresAt/createdAt. Quiz id/ownerId/title/description/createdAt/updatedAt/deletedAt nullable. QuizVersion id/quizId/number/questions Json/settings Json/createdAt unique quizId+number. Attempt id/userId/quizId/versionId/assignmentId nullable/status/snapshot Json/answers Json/flagged Json/revision/score nullable/maxScore/startedAt/expiresAt nullable/submittedAt nullable/grade Json nullable. Course id/ownerId/name/description/code unique/createdAt. CourseMembership id/courseId/userId unique course+user. Assignment id/courseId/quizId/versionId/title/startsAt/endsAt/durationMinutes/attemptLimit/accessCodeHash nullable/allowBacktracking/integrityEnabled/createdAt. IntegrityEvent id/attemptId/type/createdAt. StudyMaterial id/ownerId/name/type/size/storageKey/status/error nullable/createdAt. MaterialChunk id/materialId/text/label/position. AIJob id/ownerId/kind/status/payload Json/progress/attempts/lockedAt nullable/error nullable/resultQuizId nullable/createdAt/updatedAt. AuditLog id/userId nullable/action/resourceId/createdAt. RateLimit id/count/resetAt. VerificationToken id/userId/tokenHash unique/type/expiresAt.

## Service locations

Server/domain paths below are relative to `services/platform/src`; the Prisma schema is `services/platform/prisma/schema.prisma`. The frontend contains the UI and bounded proxy only. The ownership notes record the original implementation division, not runtime process ownership.

### Implementation ownership

Assessment worker owns prisma schema, domain schemas/grading/permissions and `server/assessment.ts`: listQuizzes(userId), createQuiz(userId,body), getQuiz(userId,id), updateQuiz(userId,id,body), deleteQuiz(userId,id), startAttempt(userId,quizId,input), getAttempt(userId,id), saveAnswers(userId,id,body), submitAttempt(userId,id). Return contract values directly.
Root owns db singleton `server/db.ts`, common `server/errors.ts` AppError(code,message,status), auth, course services, route adapter, dependencies/config/CI/docs and integration.
Ingestion worker owns `server/materials.ts`: listMaterials(userId), uploadMaterial(userId,file:File), deleteMaterial(userId,id), getChunks(userId,id), generationConfig(), enqueueGeneration(userId,body), getJob(userId,id); plus worker entry and parsers/provider/storage.
UI worker owns new routes/components, new root landing/layout/theme CSS and browser api helper. No server or dependency edits. All imports from server use relative paths so worker/tests run in Node; browser aliases may use @/.
