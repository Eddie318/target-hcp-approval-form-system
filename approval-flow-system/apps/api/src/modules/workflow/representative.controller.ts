import { Controller, Get, Headers } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { WorkflowScopeService } from "./workflow.scope";
import { WorkflowRoleEnum } from "./workflow.constants";

@ApiTags("representatives")
@Controller("representatives")
export class RepresentativeController {
  constructor(private readonly scopeService: WorkflowScopeService) {}

  @Get("scope")
  async getScope(
    @Headers("x-actor-code") actorCode?: string,
    @Headers("x-actor-role") actorRole?: string,
  ) {
    const reps = await this.scopeService.getRepresentatives(
      actorRole as any as WorkflowRoleEnum,
      actorCode || "",
    );
    return reps;
  }
}
