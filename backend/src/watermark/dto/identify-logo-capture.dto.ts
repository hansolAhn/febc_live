import { IsObject, IsString } from "class-validator";

export class IdentifyLogoCaptureDto {
  @IsString()
  capturedImageRef!: string;

  @IsObject()
  extractedHints!: Record<string, unknown>;
}
