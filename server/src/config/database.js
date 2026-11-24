import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const storage=path.resolve(process.env.DB_PATH||'./storage/college_projects.db');
fs.mkdirSync(path.dirname(storage),{recursive:true});
export const db=new Database(storage);
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

export function initializeDatabase(){
  db.exec(`
    CREATE TABLE IF NOT EXISTS departments(department_id INTEGER PRIMARY KEY,name TEXT NOT NULL UNIQUE);
    CREATE TABLE IF NOT EXISTS users(user_id INTEGER PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN('STUDENT','FACULTY','DEPARTMENT_ADMIN','SYSTEM_ADMIN')),department_id INTEGER REFERENCES departments(department_id),is_active INTEGER NOT NULL DEFAULT 1,email_verified INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS projects(project_id INTEGER PRIMARY KEY,title TEXT NOT NULL,description TEXT,department_id INTEGER REFERENCES departments(department_id),owner_id INTEGER NOT NULL REFERENCES users(user_id),guide_id INTEGER REFERENCES users(user_id),status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN('DRAFT','PROPOSAL_SUBMITTED','UNDER_REVIEW','REVISION_REQUIRED','APPROVED','IN_PROGRESS','COMPLETED','REJECTED')),created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS project_members(project_member_id INTEGER PRIMARY KEY,project_id INTEGER NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,user_id INTEGER NOT NULL REFERENCES users(user_id),joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(project_id,user_id));
    CREATE TABLE IF NOT EXISTS tasks(task_id INTEGER PRIMARY KEY,project_id INTEGER NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,title TEXT NOT NULL,description TEXT,status TEXT NOT NULL DEFAULT 'TODO',due_date TEXT,assignee_id INTEGER REFERENCES users(user_id));
    CREATE TABLE IF NOT EXISTS milestones(milestone_id INTEGER PRIMARY KEY,project_id INTEGER NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,title TEXT NOT NULL,due_date TEXT,is_completed INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS submissions(submission_id INTEGER PRIMARY KEY,project_id INTEGER NOT NULL REFERENCES projects(project_id),submitter_id INTEGER NOT NULL REFERENCES users(user_id),submission_type TEXT NOT NULL CHECK(submission_type IN('PROPOSAL','DELIVERABLE')),file_path TEXT,original_name TEXT,status TEXT NOT NULL DEFAULT 'PENDING',submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,reviewer_id INTEGER REFERENCES users(user_id));
    CREATE TABLE IF NOT EXISTS feedback(feedback_id INTEGER PRIMARY KEY,submission_id INTEGER NOT NULL REFERENCES submissions(submission_id),reviewer_id INTEGER NOT NULL REFERENCES users(user_id),comments TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS notifications(notification_id INTEGER PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(user_id),message TEXT NOT NULL,is_read INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS categories(category_id INTEGER PRIMARY KEY,name TEXT NOT NULL,description TEXT,department_id INTEGER REFERENCES departments(department_id),is_active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(name,department_id));
    CREATE TABLE IF NOT EXISTS system_settings(setting_key TEXT PRIMARY KEY,setting_value TEXT NOT NULL,updated_by INTEGER REFERENCES users(user_id),updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS audit_logs(audit_id INTEGER PRIMARY KEY,user_id INTEGER REFERENCES users(user_id),action TEXT NOT NULL,resource_type TEXT NOT NULL,resource_id TEXT,details TEXT,ip_address TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS role_permissions(role TEXT NOT NULL,permission TEXT NOT NULL,allowed INTEGER NOT NULL DEFAULT 0,updated_by INTEGER REFERENCES users(user_id),updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(role,permission));
    CREATE TABLE IF NOT EXISTS auth_tokens(token_id INTEGER PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,purpose TEXT NOT NULL CHECK(purpose IN('EMAIL_VERIFY','PASSWORD_RESET')),token_hash TEXT NOT NULL UNIQUE,expires_at TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE INDEX IF NOT EXISTS idx_auth_tokens_user ON auth_tokens(user_id,purpose);
    CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
    CREATE INDEX IF NOT EXISTS idx_submissions_project ON submissions(project_id);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
  `);
  const userColumns=db.prepare('PRAGMA table_info(users)').all().map(c=>c.name);
  if(!userColumns.includes('email_verified'))db.exec('ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 1');
  const columns=db.prepare('PRAGMA table_info(projects)').all().map(c=>c.name);
  if(!columns.includes('category_id'))db.exec('ALTER TABLE projects ADD COLUMN category_id INTEGER REFERENCES categories(category_id)');
  const defaults=[
    ['STUDENT','project.create',1],['STUDENT','project.submit',1],['STUDENT','task.update',1],
    ['FACULTY','project.review',1],['FACULTY','task.manage',1],['FACULTY','feedback.create',1],
    ['DEPARTMENT_ADMIN','department.manage',1],['DEPARTMENT_ADMIN','categories.manage',1],['DEPARTMENT_ADMIN','users.manage',1],['DEPARTMENT_ADMIN','reports.view',1],
    ['SYSTEM_ADMIN','categories.manage',1],['SYSTEM_ADMIN','system.configure',1],['SYSTEM_ADMIN','permissions.manage',1],['SYSTEM_ADMIN','audit.view',1]
  ];
  const insert=db.prepare('INSERT OR IGNORE INTO role_permissions(role,permission,allowed) VALUES(?,?,?)');
  const seed=db.transaction(()=>defaults.forEach(row=>insert.run(...row)));
  seed();
}
