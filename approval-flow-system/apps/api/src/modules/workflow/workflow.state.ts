import {
  WorkflowAction,
  WorkflowActionEnum,
  WorkflowStatus,
  WorkflowStatusEnum,
} from "./workflow.constants";

// 合法状态迁移映射
export const WorkflowTransitions: Record<WorkflowStatus, WorkflowAction[]> = {
  [WorkflowStatusEnum.DRAFT]: [
    WorkflowActionEnum.SUBMIT,
    WorkflowActionEnum.WITHDRAW,
  ],
  [WorkflowStatusEnum.PENDING]: [
    WorkflowActionEnum.APPROVE,
    WorkflowActionEnum.REJECT,
    WorkflowActionEnum.RETURN,
    WorkflowActionEnum.WITHDRAW,
  ],
  [WorkflowStatusEnum.IN_PROGRESS]: [
    WorkflowActionEnum.APPROVE,
    WorkflowActionEnum.REJECT,
    WorkflowActionEnum.RETURN,
    WorkflowActionEnum.WITHDRAW,
  ],
  [WorkflowStatusEnum.REJECTED]: [],
  [WorkflowStatusEnum.WITHDRAWN]: [],
  [WorkflowStatusEnum.APPROVED]: [],
};

export function canTransition(
  status: WorkflowStatus,
  action: WorkflowAction,
): boolean {
  return WorkflowTransitions[status]?.includes(action) ?? false;
}
