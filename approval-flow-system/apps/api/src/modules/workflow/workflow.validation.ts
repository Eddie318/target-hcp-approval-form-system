import { BadRequestException } from "@nestjs/common";
import { WorkflowTypeEnum } from "./workflow.constants";

type WorkflowTypeValue =
  (typeof WorkflowTypeEnum)[keyof typeof WorkflowTypeEnum];

function validateCancelTargetHospital(payload: any) {
  const distributions = payload?.distributions;
  if (!Array.isArray(distributions) || distributions.length === 0) {
    throw new BadRequestException(
      "取消目标医院：需提供分配明细（distributions）",
    );
  }
  let total = 0;
  for (const item of distributions) {
    if (!item?.targetHospitalCode) {
      throw new BadRequestException(
        "取消目标医院：分配明细缺少 targetHospitalCode",
      );
    }
    // 支持 percent 或 sharePercent 字段
    const rawPercent = item.percent ?? item.sharePercent;
    const percent = Number(rawPercent);
    if (Number.isNaN(percent) || percent <= 0) {
      throw new BadRequestException(
        `取消目标医院：分配百分比需为正数，医院 ${item.targetHospitalCode}`,
      );
    }
    total += percent;
  }
  if (Math.abs(total - 100) > 0.0001) {
    throw new BadRequestException(
      `取消目标医院：分配百分比合计必须为 100%，当前=${total}`,
    );
  }
}

export function validatePayload(type: WorkflowTypeValue, payload: any) {
  switch (type) {
    case WorkflowTypeEnum.CANCEL_TARGET_HOSPITAL:
      validateCancelTargetHospital(payload);
      break;
    default:
      break;
  }
}
