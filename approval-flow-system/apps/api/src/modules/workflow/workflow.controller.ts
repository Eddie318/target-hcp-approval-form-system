import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBody, ApiTags } from "@nestjs/swagger";
import { CreateWorkflowDto } from "./dto/create-workflow.dto";
import { WorkflowService } from "./workflow.service";
import { ActionWorkflowDto } from "./dto/action-workflow.dto";
import { ListWorkflowQueryDto } from "./dto/list-workflow.dto";
import { CreateAttachmentDto } from "./dto/create-attachment.dto";

@ApiTags("workflows")
@Controller("workflows")
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateWorkflowDto) {
    // 占位：返回临时数据，后续替换为真实创建逻辑
    return this.workflowService.create(dto);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @Query("actorCode") actorCode?: string) {
    return this.workflowService.findOne(id, actorCode);
  }

  @Post(":id/actions")
  @ApiBody({ type: ActionWorkflowDto })
  act(@Param("id") id: string, @Body() dto: ActionWorkflowDto) {
    // 占位：type/role 理应来自流程/鉴权；此处暂从 payload 透传
    return this.workflowService.act(id, dto as any);
  }

  @Get()
  list(@Query() query: ListWorkflowQueryDto) {
    return this.workflowService.list(query);
  }

  @Post(":id/attachments")
  @ApiBody({ type: CreateAttachmentDto })
  addAttachment(@Param("id") id: string, @Body() dto: CreateAttachmentDto) {
    return this.workflowService.addAttachment(id, dto);
  }
}
