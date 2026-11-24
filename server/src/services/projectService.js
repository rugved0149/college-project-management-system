import { db } from '../config/database.js';
import {
  addProjectMember, canManageProject, canViewProject, createProject, findProject,
  findUserByEmail, getProjectWorkspace, isProjectMember, listProjectsForUser,
  notifyProjectMembers, notifyUser, removeProjectMember, setProjectGuide, setProjectStatus, updateProjectDetails
} from '../repositories/projectRepository.js';

export function listProjects(user) {
  return listProjectsForUser(user);
}

export function createUserProject(user, input) {
  if (user.role !== 'STUDENT') throw Object.assign(new Error('Only students can create projects'), { status: 403 });
  if (!input.title?.trim()) throw Object.assign(new Error('Project title is required'), { status: 400 });
  let categoryId=null;
  if(input.category_id!==undefined&&input.category_id!==null&&input.category_id!==''){
    const category=db.prepare('SELECT category_id FROM categories WHERE category_id=? AND is_active=1 AND (department_id=? OR department_id IS NULL)').get(Number(input.category_id),user.department_id);
    if(!category)throw Object.assign(new Error('Choose an active category from your department'),{status:400});
    categoryId=category.category_id;
  }
  return createProject({ title: input.title.trim(), description: input.description?.trim() || '', userId: user.user_id, categoryId });
}

export function getProjectForUser(user, projectId) {
  const project = findProject(projectId);
  if (!project) throw Object.assign(new Error('Project not found'), { status: 404 });
  if (!canViewProject(project, user)) throw Object.assign(new Error('You do not have access to this project'), { status: 403 });
  return getProjectWorkspace(projectId);
}

export function editProject(user, projectId, input) {
  const project = findProject(projectId);
  if (!project) throw Object.assign(new Error('Project not found'), { status: 404 });
  if (!canManageProject(project, user)) throw Object.assign(new Error('You cannot edit this project'), { status: 403 });
  if (input.status !== undefined) throw Object.assign(new Error('Project status can only change through proposal and deliverable review workflows'), { status: 400 });
  const title = input.title === undefined ? project.title : String(input.title).trim();
  if (!title) throw Object.assign(new Error('Project title is required'), { status: 400 });
  return updateProjectDetails(projectId, { title, description: input.description ?? project.description });
}

export function addMember(user, projectId, email) {
  const project = findProject(projectId);
  if (!project) throw Object.assign(new Error('Project not found'), { status: 404 });
  if (!canManageProject(project, user)) throw Object.assign(new Error('Only the project owner or an authorized administrator can manage team members'), { status: 403 });
  const target = findUserByEmail(String(email || '').trim().toLowerCase());
  if (!target || !target.is_active || target.role !== 'STUDENT') throw Object.assign(new Error('Enter the email of an active student account'), { status: 404 });
  if (target.department_id !== project.department_id) throw Object.assign(new Error('Team members must belong to the project department'), { status: 400 });
  if (isProjectMember(projectId, target.user_id)) throw Object.assign(new Error('This student is already a project member'), { status: 409 });
  addProjectMember(projectId, target.user_id);
  notifyUser(target.user_id, `You were added to the project "${project.title}".`);
  return { user_id: target.user_id, name: target.name, email: target.email, role: target.role };
}

export function removeMember(user, projectId, memberId) {
  const project = findProject(projectId);
  if (!project) throw Object.assign(new Error('Project not found'), { status: 404 });
  if (!canManageProject(project, user)) throw Object.assign(new Error('You cannot manage this project team'), { status: 403 });
  if (Number(memberId) === project.owner_id) throw Object.assign(new Error('The project owner cannot be removed'), { status: 400 });
  if (!isProjectMember(projectId, Number(memberId))) throw Object.assign(new Error('Project member not found'), { status: 404 });
  removeProjectMember(projectId, Number(memberId));
}

export function assignGuide(user, projectId, email) {
  const project = findProject(projectId);
  if (!project) throw Object.assign(new Error('Project not found'), { status: 404 });
  if (!['DEPARTMENT_ADMIN', 'SYSTEM_ADMIN'].includes(user.role)) throw Object.assign(new Error('Only department or system administrators can assign faculty guides'), { status: 403 });
  if (user.role === 'DEPARTMENT_ADMIN' && project.department_id !== user.department_id) throw Object.assign(new Error('Project is outside your department'), { status: 403 });
  const guide = findUserByEmail(String(email || '').trim().toLowerCase());
  if (!guide || !guide.is_active || guide.role !== 'FACULTY' || guide.department_id !== project.department_id) throw Object.assign(new Error('Enter an active faculty account from the project department'), { status: 400 });
  setProjectGuide(projectId, guide.user_id);
  notifyUser(guide.user_id, `You have been assigned as faculty guide for "${project.title}".`);
  return { user_id: guide.user_id, name: guide.name, email: guide.email };
}

export function startProject(user, projectId) {
  const project = findProject(projectId);
  if (!project) throw Object.assign(new Error('Project not found'), { status: 404 });
  if (!canManageProject(project, user)) throw Object.assign(new Error('You cannot start this project'), { status: 403 });
  if (project.status !== 'APPROVED') throw Object.assign(new Error('Only an approved project can be started'), { status: 409 });
  setProjectStatus(projectId, 'IN_PROGRESS');
  notifyProjectMembers(projectId, 'The project has started.', user.user_id);
  return { success: true, status: 'IN_PROGRESS' };
}
