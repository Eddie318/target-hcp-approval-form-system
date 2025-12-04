import { $Enums } from "@prisma/client";

// 类型别名：直接使用 Prisma 生成的枚举类型，避免类型不匹配
export type WorkflowType = $Enums.WorkflowType;
export type WorkflowStatus = $Enums.WorkflowStatus;
export type WorkflowAction = $Enums.WorkflowActionType;
export type WorkflowRole = $Enums.UserRole;

// 值常量：业务判断请使用以下对象
export const WorkflowTypeEnum = {
  NEW_TARGET_HOSPITAL: "NEW_TARGET_HOSPITAL",
  CANCEL_TARGET_HOSPITAL: "CANCEL_TARGET_HOSPITAL",
  NEW_LINK_PHARMACY: "NEW_LINK_PHARMACY",
  CANCEL_LINK_PHARMACY: "CANCEL_LINK_PHARMACY",
  REGION_ADJUSTMENT: "REGION_ADJUSTMENT",
} as const;

export const WorkflowStatusEnum = {
  DRAFT: "DRAFT",
  IN_PROGRESS: "IN_PROGRESS",
  REJECTED: "REJECTED",
  APPROVED: "APPROVED",
} as const;

export const WorkflowActionEnum = {
  SUBMIT: "SUBMIT",
  APPROVE: "APPROVE",
  REJECT: "REJECT",
  RETURN: "RETURN",
  WITHDRAW: "WITHDRAW",
} as const;

export const WorkflowRoleEnum = {
  MR: "MR",
  DSM: "DSM",
  RSM: "RSM",
  BISO1: "BISO1",
  BISO2: "BISO2",
  RSD: "RSD",
  CD: "CD",
} as const;
