import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canAssignProposalForReview, canRecordProposalReview, canStartProject,
  canSubmitDeliverable, canSubmitProposal, completionStatus
} from './projectLifecycle.js';
import { PROJECT_STATUS } from './constants.js';

test('proposal submission is allowed only from draft or revision required', () => {
  assert.equal(canSubmitProposal(PROJECT_STATUS.DRAFT), true);
  assert.equal(canSubmitProposal(PROJECT_STATUS.REVISION_REQUIRED), true);
  assert.equal(canSubmitProposal(PROJECT_STATUS.APPROVED), false);
});

test('proposal review assignment and decision follow separate states', () => {
  assert.equal(canAssignProposalForReview(PROJECT_STATUS.PROPOSAL_SUBMITTED), true);
  assert.equal(canAssignProposalForReview(PROJECT_STATUS.DRAFT), false);
  assert.equal(canRecordProposalReview(PROJECT_STATUS.UNDER_REVIEW), true);
  assert.equal(canRecordProposalReview(PROJECT_STATUS.PROPOSAL_SUBMITTED), false);
});

test('approved projects must be explicitly started before deliverables', () => {
  assert.equal(canStartProject(PROJECT_STATUS.APPROVED), true);
  assert.equal(canStartProject(PROJECT_STATUS.DRAFT), false);
  assert.equal(canSubmitDeliverable(PROJECT_STATUS.IN_PROGRESS), true);
  assert.equal(canSubmitDeliverable(PROJECT_STATUS.APPROVED), false);
});

test('completion requires approved final deliverable and all work closed', () => {
  assert.equal(completionStatus({approvedDeliverable:true,openTasks:0,openMilestones:0}), PROJECT_STATUS.COMPLETED);
  assert.equal(completionStatus({approvedDeliverable:false,openTasks:0,openMilestones:0}), PROJECT_STATUS.IN_PROGRESS);
  assert.equal(completionStatus({approvedDeliverable:true,openTasks:1,openMilestones:0}), PROJECT_STATUS.IN_PROGRESS);
  assert.equal(completionStatus({approvedDeliverable:true,openTasks:0,openMilestones:1}), PROJECT_STATUS.IN_PROGRESS);
});
