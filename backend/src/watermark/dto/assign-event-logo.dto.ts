import { IsObject, IsString } from "class-validator";

export class AssignEventLogoDto {
  @IsString()
  eventCode!: string;

  @IsString()
  branchCode!: string;

  @IsString()
  profileId!: string;

  @IsString()
  sessionCode!: string;

  @IsObject()
  visibleOverlayPayload!: Record<string, unknown>;

  @IsObject()
  hiddenOverlayPayload!: Record<string, unknown>;
}
