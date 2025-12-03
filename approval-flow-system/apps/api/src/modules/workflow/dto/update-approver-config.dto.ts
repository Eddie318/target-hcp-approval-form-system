import { PartialType } from "@nestjs/swagger";
import { CreateApproverConfigDto } from "./create-approver-config.dto";

export class UpdateApproverConfigDto extends PartialType(
  CreateApproverConfigDto,
) {}
