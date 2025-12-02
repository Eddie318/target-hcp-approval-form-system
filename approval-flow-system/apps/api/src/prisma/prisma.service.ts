import { Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  async enableShutdownHooks(): Promise<void> {
    // 如需优雅关闭可恢复 beforeExit 钩子；当前不注册以避免类型报错
  }
}
