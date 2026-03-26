import { ForbiddenException } from "@nestjs/common";

export class PolicyViolationException extends ForbiddenException {
  constructor(message: string) {
    super(message);
  }
}
