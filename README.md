# QuizVault

A personal question-bank and quiz web application built with Node.js, Express, PostgreSQL, and EJS.

## Features

- Create question sets with a name and description
- Upload questions via CSV file
- Full CSV validation before inserting into database
- View all questions in a question set (with correct answers visible)
- Flag / unflag important questions (AJAX, no page reload)
- Take a quiz — one question at a time, navigate freely
- Submit quiz and see score, accuracy, and per-question breakdown
- Flagged Questions page — all flagged questions grouped by set
- Quiz attempts stored in PostgreSQL

---

## Tech Stack

| Layer       | Technology              |
|-------------|-------------------------|
| Runtime     | Node.js (ES Modules)    |
| Framework   | Express.js              |
| Database    | PostgreSQL              |
| ORM / Query | pg (node-postgres)      |
| Templating  | EJS                     |
| UI          | Bootstrap 5 + Bootstrap Icons (CDN) |
| File Upload | Multer                  |
| CSV Parsing | csv-parser              |
| Sessions    | express-session         |
| Flash Msgs  | connect-flash           |
| Config      | dotenv                  |

---

## Prerequisites

- **Node.js** v18 or higher
- **PostgreSQL** v14 or higher

---

## Setup Instructions

### 1. Clone / Download the project

```bash
cd QuizVault
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create the PostgreSQL database

Open your PostgreSQL client (psql, pgAdmin, DBeaver, etc.) and run:

```sql
CREATE DATABASE quizvault;
```

Then connect to it and run the schema:

```bash
psql -U postgres -d quizvault -f db/schema.sql
```

Or paste the contents of `db/schema.sql` into your SQL client.

### 4. Configure environment variables

Edit the `.env` file in the project root:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=quizvault
DB_USER=postgres
DB_PASSWORD=your_actual_password_here
SESSION_SECRET=change_this_to_a_random_secret_string
```

> **Important:** Replace `your_actual_password_here` with your PostgreSQL password.

### 5. Start the application

```bash
npm start
```

Open your browser and visit: **http://localhost:3000**

For development with auto-restart on file changes:

```bash
npm run dev
```

*(Requires nodemon — already listed as a dev dependency)*

---

## CSV Format

Your CSV file must have the following headers (case-insensitive, spaces allowed):

```
question,optionA,optionB,optionC,optionD,correctAnswer
```

### Example CSV

```csv
question,optionA,optionB,optionC,optionD,correctAnswer
"What is SQL?","A query language","A database","An operating system","A protocol","A"
"What does DBMS stand for?","Data Base Management System","Digital Base Memory Store","Data Byte Management System","None of these","A"
"Which of the following is a DDL command?","SELECT","INSERT","CREATE","UPDATE","C"
"What is a primary key?","Unique identifier for each row","A duplicate value","A foreign key","An index","A"
"What is normalization?","Process of organizing data","Process of deleting data","Process of duplicating data","None","A"
```

### Validation Rules

- File must be `.csv`
- Maximum file size: **5 MB**
- All 6 columns must be present
- No required field may be empty
- `correctAnswer` must be exactly `A`, `B`, `C`, or `D`
- Completely empty rows are ignored
- If **any** row has an error, **no questions** are inserted (all-or-nothing)

---

## Project Structure

```
QuizVault/
├── app.js                  # Express app entry point
├── package.json
├── .env                    # Environment variables (not committed)
├── .gitignore
│
├── db/
│   ├── db.js               # PostgreSQL connection pool
│   └── schema.sql          # Database schema (run once to set up)
│
├── routes/
│   ├── sets.js             # /sets routes
│   ├── questions.js        # /questions routes
│   ├── quiz.js             # /sets/:id/quiz routes
│   └── flagged.js          # /flagged route
│
├── controllers/
│   ├── setController.js    # Question set logic
│   ├── questionController.js # Flag logic + flagged page
│   └── quizController.js   # Quiz display + submission
│
├── utils/
│   └── csvParser.js        # CSV parsing & validation
│
├── views/
│   ├── partials/
│   │   ├── header.ejs
│   │   ├── navbar.ejs
│   │   ├── footer.ejs
│   │   └── flash.ejs
│   ├── dashboard.ejs
│   ├── create-set.ejs
│   ├── upload.ejs
│   ├── questions.ejs
│   ├── quiz.ejs
│   ├── result.ejs
│   ├── flagged.ejs
│   └── error.ejs
│
├── public/
│   ├── css/style.css
│   └── js/app.js
│
└── uploads/                # Temp CSV upload dir (auto-created, not committed)
```

---

## Routes Reference

| Method | Route                     | Description                        |
|--------|---------------------------|------------------------------------|
| GET    | `/`                       | Redirects to `/dashboard`          |
| GET    | `/dashboard`              | Lists all question sets            |
| GET    | `/sets/new`               | Create new question set form       |
| POST   | `/sets`                   | Create a new question set          |
| GET    | `/sets/:id`               | View questions in a set            |
| GET    | `/sets/:id/upload`        | CSV upload form                    |
| POST   | `/sets/:id/upload`        | Upload & validate CSV              |
| POST   | `/sets/:id/delete`        | Delete a question set              |
| POST   | `/questions/:id/toggle-flag` | Flag / unflag a question        |
| GET    | `/sets/:id/quiz`          | Start quiz for a set               |
| POST   | `/sets/:id/quiz/submit`   | Submit quiz answers                |
| GET    | `/flagged`                | View all flagged questions         |

---

## Database Schema

```sql
question_sets (id, name, description, created_at)
questions     (id, question_set_id, question_text, option_a..d, correct_answer, is_flagged, created_at)
quiz_attempts (id, question_set_id, score, total_questions, created_at)
```

---

## Future Features (not in MVP)

- Google / Email authentication
- Per-user question sets
- AI-powered question generation
- Spaced repetition / smart review
- Leaderboards and social features
- Detailed per-question attempt tracking
- Export results as PDF
- Admin panel

---

## License

MIT
