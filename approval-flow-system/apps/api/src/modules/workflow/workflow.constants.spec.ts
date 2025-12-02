import {
  WorkflowActionEnum,
  WorkflowRoleEnum,
  WorkflowStatusEnum,
  WorkflowTypeEnum,
} from "./workflow.constants";

describe("workflow constants", () => {
  it("should expose workflow types", () => {
    expect(Object.values(WorkflowTypeEnum).length).toBeGreaterThan(0);
  });

  it("should expose workflow statuses", () => {
    expect(Object.values(WorkflowStatusEnum)).toContain("DRAFT");
  });

  it("should expose actions", () => {
    expect(WorkflowActionEnum.SUBMIT).toBe("SUBMIT");
  });

  it("should expose roles", () => {
    expect(Object.values(WorkflowRoleEnum)).toContain("MR");
  });
});
