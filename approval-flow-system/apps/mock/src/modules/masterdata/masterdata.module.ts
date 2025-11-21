import { Module } from "@nestjs/common";
import { MasterdataController } from "./masterdata.controller";

@Module({
  controllers: [MasterdataController],
})
export class MasterdataModule {}
