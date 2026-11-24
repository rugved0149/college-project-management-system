import { PROJECT_STATUS, SUBMISSION_STATUS } from './constants.js';

export function canSubmitProposal(status) {
  return [PROJECT_STATUS.DRAFT, PROJECT_STATUS.REVISION_REQUIRED].includes(status);
}

export function canAssignProposalForReview(status) {
  return status === PROJECT_STATUS.PROPOSAL_SUBMITTED;
}

export function canRecordProposalReview(status) {
  return status === PROJECT_STATUS.UNDER_REVIEW;
}

export function proposalDecisionStatus(decision) {
  if (![SUBMISSION_STATUS.APPROVED, SUBMISSION_STATUS.REVISION_REQUIRED, SUBMISSION_STATUS.REJECTED].includes(decision)) {
    throw new Error('Invalid proposal decision');
  }
  return decision;
}

export function canStartProject(status) {
  return status === PROJECT_STATUS.APPROVED;
}

export function canSubmitDeliverable(status) {
  return status === PROJECT_STATUS.IN_PROGRESS;
}

export function completionStatus({ approvedDeliverable, openTasks, openMilestones }) {
  return approvedDeliverable && openTasks === 0 && openMilestones === 0
    ? PROJECT_STATUS.COMPLETED
    : PROJECT_STATUS.IN_PROGRESS;
}
