import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { ApiTags } from "@nestjs/swagger";
import { CreateApproverConfigDto } from "./dto/create-approver-config.dto";
import { UpdateApproverConfigDto } from "./dto/update-approver-config.dto";
import { IsBooleanString, IsEnum, IsOptional, IsString } from "class-validator";
import { WorkflowRoleEnum, WorkflowTypeEnum } from "./workflow.constants";

class ApproverQueryDto {
  @IsOptional()
  @IsEnum(WorkflowTypeEnum)
  workflowType?: WorkflowTypeEnum;

  @IsOptional()
  @IsEnum(WorkflowRoleEnum)
  role?: WorkflowRoleEnum;

  @IsOptional()
  @IsBooleanString()
  enabled?: string;

  @IsOptional()
  @IsString()
  email?: string;
}

@ApiTags("approver-configs")
@Controller("approver-configs")
export class ApproverConfigController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@Query() query: ApproverQueryDto) {
    const where: any = {};
    if (query.workflowType) where.workflowType = query.workflowType;
    if (query.role) where.role = query.role;
    if (query.email) where.email = query.email;
    if (query.enabled !== undefined) {
      where.enabled = query.enabled === "true";
    }
    return this.prisma.approverConfig.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  }

  @Post()
  create(@Body() dto: CreateApproverConfigDto) {
    return this.prisma.approverConfig.create({ data: dto as any });
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() dto: UpdateApproverConfigDto) {
    return this.prisma.approverConfig.update({
      where: { id },
      data: dto as any,
    });
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.prisma.approverConfig.delete({ where: { id } });
  }
}
