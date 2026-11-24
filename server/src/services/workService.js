import {
  createMilestone, createSubmission, createTask, findMilestone, findSubmission,
  completeProjectIfReady, findTask, listReviewsForUser, listTasksForUser, reviewSubmission, updateMilestone,
  updateTask
} from '../repositories/workRepository.js';
import {
  canManageProject, canViewProject, findProject, isProjectMember,
  notifyProjectMembers, setProjectStatus
} from '../repositories/projectRepository.js';

export function listTasks(user) {
  return listTasksForUser(user);
}

export function addTask(user, input) {
  const project = findProject(input.projectId);
  if (!project) throw Object.assign(new Error('Project not found'), { status: 404 });
  if (!canManageProject(project, user)) throw Object.assign(new Error('Only the project owner, assigned guide or department administrator can create tasks'), { status: 403 });
  if (!['APPROVED', 'IN_PROGRESS'].includes(project.status)) throw Object.assign(new Error('Tasks can be created after proposal approval'), { status: 409 });
  if (input.assigneeId && !isProjectMember(project.project_id, input.assigneeId)) throw Object.assign(new Error('The assignee must be a project member'), { status: 400 });
  const task = createTask({
    projectId: project.project_id, title: input.title.trim(), description: input.description || '',
    dueDate: input.dueDate || null, assigneeId: input.assigneeId || null
  });
  notifyProjectMembers(project.project_id, `A new task was added: ${task.title}`, user.user_id);
  return task;
}

export function changeTask(user, taskId, input) {
  const task = findTask(taskId);
  if (!task) throw Object.assign(new Error('Task not found'), { status: 404 });
  const project = findProject(task.project_id);
  const manager = canManageProject(project, user);
  const assigned = task.assignee_id === user.user_id;
  if (!manager && !assigned) throw Object.assign(new Error('You cannot update this task'), { status: 403 });
  if (!manager && (input.assigneeId !== undefined || input.dueDate !== undefined)) throw Object.assign(new Error('Only project managers can reassign tasks or change due dates'), { status: 403 });
  if (input.status && !['TODO', 'IN_PROGRESS', 'COMPLETED'].includes(input.status)) throw Object.assign(new Error('Invalid task status'), { status: 400 });
  const updated = updateTask(taskId, {
    status: input.status || null, assigneeId: input.assigneeId ?? null, dueDate: input.dueDate ?? null
  });
  completeProjectIfReady(project.project_id);
  return updated;
}

export function addMilestone(user, input) {
  const project = findProject(input.projectId);
  if (!project) throw Object.assign(new Error('Project not found'), { status: 404 });
  if (!canManageProject(project, user)) throw Object.assign(new Error('You cannot manage milestones for this project'), { status: 403 });
  if (!['APPROVED', 'IN_PROGRESS'].includes(project.status)) throw Object.assign(new Error('Milestones can be created after proposal approval'), { status: 409 });
  const milestone = createMilestone({ projectId: project.project_id, title: input.title.trim(), dueDate: input.dueDate || null });
  notifyProjectMembers(project.project_id, `A new milestone was added: ${milestone.title}`, user.user_id);
  return milestone;
}

export function changeMilestone(user, milestoneId, input) {
  const milestone = findMilestone(milestoneId);
  if (!milestone) throw Object.assign(new Error('Milestone not found'), { status: 404 });
  const project = findProject(milestone.project_id);
  if (!canManageProject(project, user)) throw Object.assign(new Error('You cannot update this milestone'), { status: 403 });
  if (input.isCompleted !== undefined && ![true, false, 0, 1].includes(input.isCompleted)) throw Object.assign(new Error('Invalid milestone completion value'), { status: 400 });
  const updated = updateMilestone(milestoneId, {
    title: input.title ?? null, dueDate: input.dueDate ?? null,
    isCompleted: input.isCompleted === undefined ? null : Number(Boolean(input.isCompleted))
  });
  completeProjectIfReady(project.project_id);
  return updated;
}

export function assignSubmissionForReview(user, submissionId) {
  const submission = findSubmission(submissionId);
  if (!submission) throw Object.assign(new Error('Submission not found'), { status: 404 });
  const project = findProject(submission.project_id);
  const allowed = user.role === 'SYSTEM_ADMIN' ||
    (user.role === 'DEPARTMENT_ADMIN' && project.department_id === user.department_id) ||
    (user.role === 'FACULTY' && project.guide_id === user.user_id);
  if (!allowed) throw Object.assign(new Error('You are not authorized to assign this submission for review'), { status: 403 });
  if (submission.status !== 'PENDING' || submission.submission_type !== 'PROPOSAL') throw Object.assign(new Error('Only pending proposals can be assigned for review'), { status: 409 });
  setProjectStatus(project.project_id, 'UNDER_REVIEW');
  return { success: true, status: 'UNDER_REVIEW' };
}

export function listReviews(user) {
  return listReviewsForUser(user);
}

export function submitProjectWork(user, input) {
  const project = findProject(input.projectId);
  if (!project) throw Object.assign(new Error('Project not found'), { status: 404 });
  if (!isProjectMember(project.project_id, user.user_id)) throw Object.assign(new Error('Only project members can submit project work'), { status: 403 });
  if (!['PROPOSAL', 'DELIVERABLE'].includes(input.submissionType)) throw Object.assign(new Error('Invalid submission type'), { status: 400 });
  if (input.submissionType === 'PROPOSAL' && !['DRAFT', 'REVISION_REQUIRED'].includes(project.status)) throw Object.assign(new Error('A proposal can only be submitted for a draft or revision-required project'), { status: 409 });
  if (input.submissionType === 'DELIVERABLE' && project.status !== 'IN_PROGRESS') throw Object.assign(new Error('Deliverables can only be submitted for projects in progress'), { status: 409 });
  const submission = createSubmission({
    projectId: project.project_id, submitterId: user.user_id, submissionType: input.submissionType,
    filePath: input.filePath, originalName: input.originalName
  });
  if (input.submissionType === 'PROPOSAL') setProjectStatus(project.project_id, 'PROPOSAL_SUBMITTED');
  notifyProjectMembers(project.project_id, `A ${input.submissionType.toLowerCase()} was submitted for review.`, user.user_id);
  return submission;
}

export function reviewProjectSubmission(user, submissionId, input) {
  const submission = findSubmission(submissionId);
  if (!submission) throw Object.assign(new Error('Submission not found'), { status: 404 });
  const project = findProject(submission.project_id);
  const allowed = user.role === 'SYSTEM_ADMIN' ||
    (user.role === 'DEPARTMENT_ADMIN' && project.department_id === user.department_id) ||
    (user.role === 'FACULTY' && project.guide_id === user.user_id);
  if (!allowed) throw Object.assign(new Error('Only the assigned faculty guide or an authorized administrator can review this submission'), { status: 403 });
  if (submission.status !== 'PENDING') throw Object.assign(new Error('This submission has already been reviewed'), { status: 409 });
  if (!['APPROVED', 'REVISION_REQUIRED', 'REJECTED'].includes(input.decision) || !input.comments?.trim()) throw Object.assign(new Error('A valid decision and feedback are required'), { status: 400 });
  reviewSubmission({ submission, reviewerId: user.user_id, decision: input.decision, comments: input.comments.trim() });
  return { success: true };
}

export function getSubmissionFile(user, submissionId) {
  const submission = findSubmission(submissionId);
  if (!submission) throw Object.assign(new Error('Submission not found'), { status: 404 });
  const project = findProject(submission.project_id);
  if (!canViewProject(project, user)) throw Object.assign(new Error('You cannot access this submission'), { status: 403 });
  if (!submission.file_path) throw Object.assign(new Error('No file is attached to this submission'), { status: 404 });
  return { fileName: submission.file_path, originalName: submission.original_name || 'submission' };
}
