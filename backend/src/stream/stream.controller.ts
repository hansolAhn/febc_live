import { Body, Controller, Get, Headers, Post, Query, Req, UnauthorizedException } from "@nestjs/common";
import { Request } from "express";
import { StreamService } from "./stream.service";

@Controller("stream")
export class StreamController {
  constructor(private readonly streamService: StreamService) {}

  @Post("hooks/publish")
  onPublish(@Body() body: Record<string, string>) {
    return this.streamService.validateHook("publish", body.stream ?? "unknown");
  }

  @Post("hooks/play")
  onPlay(@Body() body: Record<string, string>) {
    return this.streamService.validateHook("play", body.stream ?? "unknown");
  }

  @Post("hooks/stop")
  onStop(@Body() body: Record<string, string>) {
    return this.streamService.validateHook("stop", body.stream ?? "unknown");
  }

  @Get("playback-access")
  getPlaybackAccess(@Req() request: Request, @Query("stream") stream = "main") {
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Bearer token required");
    }

    return this.streamService.issuePlaybackAccess(authorization.replace("Bearer ", "").trim(), stream);
  }

  @Get("status")
  getStreamStatus(@Query("stream") stream = "main") {
    return this.streamService.getStreamStatus(stream);
  }

  @Get("authorize")
  authorizePlayback(
    @Headers("x-original-uri") originalUri: string,
    @Query("playbackToken") playbackToken?: string
  ) {
    const resolvedPlaybackToken = playbackToken ?? this.extractPlaybackTokenFromUri(originalUri);
    return this.streamService.authorizePlayback(originalUri, resolvedPlaybackToken);
  }

  private extractPlaybackTokenFromUri(originalUri: string) {
    if (!originalUri) {
      return undefined;
    }

    const queryString = originalUri.split("?")[1];
    if (!queryString) {
      return undefined;
    }

    const params = new URLSearchParams(queryString);
    return params.get("playbackToken") ?? undefined;
  }
}
