import {
  WorkflowAction,
  WorkflowActionEnum,
  WorkflowRole,
  WorkflowRoleEnum,
  WorkflowType,
  WorkflowTypeEnum,
} from "./workflow.constants";

// 角色-动作矩阵（占位，可后续按业务调整）
type PermissionMap = Partial<
  Record<WorkflowType, Partial<Record<WorkflowRole, WorkflowAction[]>>>
>;

export const WorkflowPermissions: PermissionMap = {
  [WorkflowTypeEnum.NEW_TARGET_HOSPITAL]: {
    [WorkflowRoleEnum.MR]: [
      WorkflowActionEnum.SUBMIT,
      WorkflowActionEnum.WITHDRAW,
    ],
    [WorkflowRoleEnum.DSM]: [
      WorkflowActionEnum.SUBMIT,
      WorkflowActionEnum.WITHDRAW,
      WorkflowActionEnum.APPROVE,
      WorkflowActionEnum.REJECT,
      WorkflowActionEnum.RETURN,
    ],
    [WorkflowRoleEnum.RSM]: [
      WorkflowActionEnum.SUBMIT,
      WorkflowActionEnum.WITHDRAW,
      WorkflowActionEnum.APPROVE,
      WorkflowActionEnum.REJECT,
      WorkflowActionEnum.RETURN,
    ],
    [WorkflowRoleEnum.BISO1]: [
      WorkflowActionEnum.APPROVE,
      WorkflowActionEnum.REJECT,
    ],
    [WorkflowRoleEnum.BISO2]: [
      WorkflowActionEnum.APPROVE,
      WorkflowActionEnum.REJECT,
    ],
    [WorkflowRoleEnum.CD]: [
      WorkflowActionEnum.APPROVE,
      WorkflowActionEnum.REJECT,
    ],
    [WorkflowRoleEnum.RSD]: [
      WorkflowActionEnum.APPROVE,
      WorkflowActionEnum.REJECT,
    ],
  },
  [WorkflowTypeEnum.CANCEL_TARGET_HOSPITAL]: {
    [WorkflowRoleEnum.MR]: [
      WorkflowActionEnum.SUBMIT,
      WorkflowActionEnum.WITHDRAW,
    ],
    [WorkflowRoleEnum.DSM]: [
      WorkflowActionEnum.SUBMIT,
      WorkflowActionEnum.WITHDRAW,
      WorkflowActionEnum.APPROVE,
      WorkflowActionEnum.REJECT,
      WorkflowActionEnum.RETURN,
    ],
    [WorkflowRoleEnum.RSM]: [
      WorkflowActionEnum.SUBMIT,
      WorkflowActionEnum.WITHDRAW,
      WorkflowActionEnum.APPROVE,
      WorkflowActionEnum.REJECT,
      WorkflowActionEnum.RETURN,
    ],
    [WorkflowRoleEnum.BISO1]: [
      WorkflowActionEnum.APPROVE,
      WorkflowActionEnum.REJECT,
    ],
    [WorkflowRoleEnum.BISO2]: [
      WorkflowActionEnum.APPROVE,
      WorkflowActionEnum.REJECT,
    ],
    [WorkflowRoleEnum.RSD]: [
      WorkflowActionEnum.APPROVE,
      WorkflowActionEnum.REJECT,
    ],
  },
  [WorkflowTypeEnum.NEW_LINK_PHARMACY]: {
    [WorkflowRoleEnum.MR]: [
      WorkflowActionEnum.SUBMIT,
      WorkflowActionEnum.WITHDRAW,
    ],
    [WorkflowRoleEnum.DSM]: [
      WorkflowActionEnum.SUBMIT,
      WorkflowActionEnum.WITHDRAW,
      WorkflowActionEnum.APPROVE,
      WorkflowActionEnum.REJECT,
      WorkflowActionEnum.RETURN,
    ],
    [WorkflowRoleEnum.RSM]: [
      WorkflowActionEnum.SUBMIT,
      WorkflowActionEnum.WITHDRAW,
      WorkflowActionEnum.APPROVE,
      WorkflowActionEnum.REJECT,
      WorkflowActionEnum.RETURN,
    ],
    [WorkflowRoleEnum.CD]: [
      WorkflowActionEnum.APPROVE,
      WorkflowActionEnum.REJECT,
    ],
    [WorkflowRoleEnum.BISO1]: [
      WorkflowActionEnum.APPROVE,
      WorkflowActionEnum.REJECT,
    ],
    [WorkflowRoleEnum.BISO2]: [
      WorkflowActionEnum.APPROVE,
      WorkflowActionEnum.REJECT,
    ],
    [WorkflowRoleEnum.RSD]: [
      WorkflowActionEnum.APPROVE,
      WorkflowActionEnum.REJECT,
    ],
  },
  [WorkflowTypeEnum.CANCEL_LINK_PHARMACY]: {
    [WorkflowRoleEnum.MR]: [
      WorkflowActionEnum.SUBMIT,
      WorkflowActionEnum.WITHDRAW,
    ],
    [WorkflowRoleEnum.DSM]: [
      WorkflowActionEnum.SUBMIT,
      WorkflowActionEnum.WITHDRAW,
      WorkflowActionEnum.APPROVE,
      WorkflowActionEnum.REJECT,
      WorkflowActionEnum.RETURN,
    ],
    [WorkflowRoleEnum.RSM]: [
      WorkflowActionEnum.SUBMIT,
      WorkflowActionEnum.WITHDRAW,
      WorkflowActionEnum.APPROVE,
      WorkflowActionEnum.REJECT,
      WorkflowActionEnum.RETURN,
    ],
    [WorkflowRoleEnum.BISO1]: [
      WorkflowActionEnum.APPROVE,
      WorkflowActionEnum.REJECT,
    ],
    [WorkflowRoleEnum.BISO2]: [
      WorkflowActionEnum.APPROVE,
      WorkflowActionEnum.REJECT,
    ],
    [WorkflowRoleEnum.RSD]: [
      WorkflowActionEnum.APPROVE,
      WorkflowActionEnum.REJECT,
    ],
  },
  [WorkflowTypeEnum.REGION_ADJUSTMENT]: {
    [WorkflowRoleEnum.DSM]: [
      WorkflowActionEnum.SUBMIT,
      WorkflowActionEnum.WITHDRAW,
    ],
    [WorkflowRoleEnum.RSM]: [
      WorkflowActionEnum.SUBMIT,
      WorkflowActionEnum.WITHDRAW,
      WorkflowActionEnum.APPROVE,
      WorkflowActionEnum.REJECT,
      WorkflowActionEnum.RETURN,
    ],
    [WorkflowRoleEnum.BISO1]: [
      WorkflowActionEnum.APPROVE,
      WorkflowActionEnum.REJECT,
    ],
    [WorkflowRoleEnum.BISO2]: [
      WorkflowActionEnum.APPROVE,
      WorkflowActionEnum.REJECT,
    ],
    [WorkflowRoleEnum.RSD]: [
      WorkflowActionEnum.APPROVE,
      WorkflowActionEnum.REJECT,
    ],
  },
};

export function allowedActions(
  type: WorkflowType,
  role: WorkflowRole,
): WorkflowAction[] {
  return WorkflowPermissions[type]?.[role] ?? [];
}
