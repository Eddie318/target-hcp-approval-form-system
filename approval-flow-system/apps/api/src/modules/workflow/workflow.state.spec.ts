import { WorkflowActionEnum, WorkflowStatusEnum } from "./workflow.constants";
import { canTransition, WorkflowTransitions } from "./workflow.state";

describe("workflow state", () => {
  it("should allow submit from draft", () => {
    expect(
      canTransition(WorkflowStatusEnum.DRAFT, WorkflowActionEnum.SUBMIT),
    ).toBe(true);
  });

  it("should block approve from approved", () => {
    expect(
      canTransition(WorkflowStatusEnum.APPROVED, WorkflowActionEnum.APPROVE),
    ).toBe(false);
  });

  it("transitions map should include statuses", () => {
    expect(Object.keys(WorkflowTransitions)).toContain(
      WorkflowStatusEnum.PENDING,
    );
  });
});
