import { Module } from "@nestjs/common";
import { SessionsModule } from "../sessions/sessions.module";
import { StreamController } from "./stream.controller";
import { StreamService } from "./stream.service";

@Module({
  imports: [SessionsModule],
  controllers: [StreamController],
  providers: [StreamService],
  exports: [StreamService]
})
export class StreamModule {}
