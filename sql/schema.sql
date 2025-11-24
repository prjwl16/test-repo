CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  role VARCHAR(20) NOT NULL
);

CREATE TABLE assignments (
  id SERIAL PRIMARY KEY,
  tutor_id INTEGER REFERENCES users(id),
  description TEXT NOT NULL,
  published_at TIMESTAMP NOT NULL,
  deadline TIMESTAMP NOT NULL
);

CREATE TABLE assignment_students (
  id SERIAL PRIMARY KEY,
  assignment_id INTEGER REFERENCES assignments(id),
  student_id INTEGER REFERENCES users(id)
);

CREATE TABLE submissions (
  id SERIAL PRIMARY KEY,
  assignment_id INTEGER REFERENCES assignments(id),
  student_id INTEGER REFERENCES users(id),
  remark TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (assignment_id, student_id)
);