import { WorkflowTypeEnum } from "./workflow.constants";
import { validatePayload } from "./workflow.validation";

describe("workflow validation", () => {
  it("should pass when cancel target hospital distributions sum to 100", () => {
    expect(() =>
      validatePayload(WorkflowTypeEnum.CANCEL_TARGET_HOSPITAL, {
        distributions: [
          { targetHospitalCode: "H1", percent: 60 },
          { targetHospitalCode: "H2", percent: 40 },
        ],
      }),
    ).not.toThrow();
  });

  it("should allow sharePercent alias", () => {
    expect(() =>
      validatePayload(WorkflowTypeEnum.CANCEL_TARGET_HOSPITAL, {
        distributions: [
          { targetHospitalCode: "H1", sharePercent: 50 },
          { targetHospitalCode: "H2", sharePercent: 50 },
        ],
      }),
    ).not.toThrow();
  });

  it("should throw when cancel target hospital distributions missing", () => {
    expect(() =>
      validatePayload(WorkflowTypeEnum.CANCEL_TARGET_HOSPITAL, {
        distributions: [],
      }),
    ).toThrow();
  });

  it("should throw when cancel target hospital total not 100", () => {
    expect(() =>
      validatePayload(WorkflowTypeEnum.CANCEL_TARGET_HOSPITAL, {
        distributions: [{ targetHospitalCode: "H1", percent: 50 }],
      }),
    ).toThrow();
  });
});
