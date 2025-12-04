import {
  WorkflowRoleEnum,
  WorkflowRole,
  WorkflowTypeEnum,
  WorkflowType,
} from "./workflow.constants";

type WorkflowTypeValue =
  | (typeof WorkflowTypeEnum)[keyof typeof WorkflowTypeEnum]
  | WorkflowType;
type WorkflowRoleValue =
  | (typeof WorkflowRoleEnum)[keyof typeof WorkflowRoleEnum]
  | WorkflowRole;

type StepDef = { sequence: number; role: WorkflowRoleValue };

// 默认审批链，后续可按表单动态调整
export const WorkflowChains: Record<WorkflowTypeValue, StepDef[]> = {
  [WorkflowTypeEnum.NEW_TARGET_HOSPITAL]: [
    { sequence: 1, role: WorkflowRoleEnum.DSM },
    { sequence: 2, role: WorkflowRoleEnum.RSM },
    { sequence: 3, role: WorkflowRoleEnum.BISO1 },
    { sequence: 4, role: WorkflowRoleEnum.BISO2 },
    { sequence: 5, role: WorkflowRoleEnum.CD },
    { sequence: 6, role: WorkflowRoleEnum.RSD },
  ],
  [WorkflowTypeEnum.CANCEL_TARGET_HOSPITAL]: [
    { sequence: 1, role: WorkflowRoleEnum.DSM },
    { sequence: 2, role: WorkflowRoleEnum.RSM },
    { sequence: 3, role: WorkflowRoleEnum.BISO1 },
    { sequence: 4, role: WorkflowRoleEnum.BISO2 },
    { sequence: 5, role: WorkflowRoleEnum.RSD },
  ],
  [WorkflowTypeEnum.NEW_LINK_PHARMACY]: [
    { sequence: 1, role: WorkflowRoleEnum.DSM },
    { sequence: 2, role: WorkflowRoleEnum.RSM },
    // C&D 动态插入（见 getDefaultSteps）
    { sequence: 3, role: WorkflowRoleEnum.BISO1 },
    { sequence: 4, role: WorkflowRoleEnum.BISO2 },
    { sequence: 5, role: WorkflowRoleEnum.RSD },
  ],
  [WorkflowTypeEnum.CANCEL_LINK_PHARMACY]: [
    { sequence: 1, role: WorkflowRoleEnum.DSM },
    { sequence: 2, role: WorkflowRoleEnum.RSM },
    { sequence: 3, role: WorkflowRoleEnum.BISO1 },
    { sequence: 4, role: WorkflowRoleEnum.BISO2 },
    { sequence: 5, role: WorkflowRoleEnum.RSD },
  ],
  [WorkflowTypeEnum.REGION_ADJUSTMENT]: [
    { sequence: 1, role: WorkflowRoleEnum.RSM },
    { sequence: 2, role: WorkflowRoleEnum.BISO1 },
    { sequence: 3, role: WorkflowRoleEnum.BISO2 },
    { sequence: 4, role: WorkflowRoleEnum.RSD },
  ],
};

function needCDStep(payload?: any): boolean {
  // 触发条件：新增关联药房且选择“其他”药店 + A类药房，或显式 requireCD=true
  if (!payload) return false;
  if (payload.requireCD === true) return true;
  const isOther = payload.isOther === true || payload.pharmacySource === "其他";
  const isAType =
    payload.pharmacyType === "A类" ||
    payload.pharmacyType === "A" ||
    payload.pharmacyType === "A_CLASS";
  return isOther && isAType;
}

export function getDefaultSteps(
  type: WorkflowTypeValue,
  payload?: any,
): StepDef[] {
  const base = WorkflowChains[type] ? [...WorkflowChains[type]] : [];
  if (type === WorkflowTypeEnum.NEW_LINK_PHARMACY && needCDStep(payload)) {
    // 在 RSM 之后插入 C&D
    const insertIndex = base.findIndex(
      (s) => s.role === WorkflowRoleEnum.BISO1,
    );
    const cdStep: StepDef = {
      sequence: (base[insertIndex - 1]?.sequence || 2) + 0.5,
      role: WorkflowRoleEnum.CD,
    };
    base.splice(insertIndex, 0, cdStep);
    // 重新排序序号为整数递增
    return base
      .sort((a, b) => a.sequence - b.sequence)
      .map((s, idx) => ({ ...s, sequence: idx + 1 }));
  }
  return base;
}
