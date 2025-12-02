import { Injectable, UnauthorizedException } from "@nestjs/common";
import * as crypto from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { WorkflowActionEnum, WorkflowRoleEnum } from "./workflow.constants";

type ShortLinkPayload = {
  workflowId: string;
  action: WorkflowActionEnum;
  role?: WorkflowRoleEnum;
  exp: number; // unix timestamp (seconds)
};

function base64url(input: Buffer) {
  return input
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signPayload(payload: ShortLinkPayload, key: string) {
  const data = JSON.stringify(payload);
  const sig = crypto.createHmac("sha256", key).update(data).digest();
  return `${base64url(Buffer.from(data))}.${base64url(sig)}`;
}

function verifyToken(token: string, key: string): ShortLinkPayload {
  const parts = token.split(".");
  if (parts.length !== 2) throw new UnauthorizedException("无效短链");
  const data = Buffer.from(parts[0], "base64").toString("utf8");
  const expected = base64url(
    crypto.createHmac("sha256", key).update(data).digest(),
  );
  if (expected !== parts[1]) throw new UnauthorizedException("短链签名错误");
  const payload = JSON.parse(data) as ShortLinkPayload;
  if (payload.exp && payload.exp * 1000 < Date.now()) {
    throw new UnauthorizedException("短链已过期");
  }
  return payload;
}

@Injectable()
export class WorkflowShortLinkService {
  private readonly key =
    process.env.SHORTLINK_SIGN_KEY || "dev-shortlink-sign-key";

  constructor(private readonly prisma: PrismaService) {}

  generate(
    workflowId: string,
    action: WorkflowActionEnum,
    role?: WorkflowRoleEnum,
    expiresInSeconds = 600,
  ) {
    const payload: ShortLinkPayload = {
      workflowId,
      action,
      role,
      exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    };
    return signPayload(payload, this.key);
  }

  async verify(token: string) {
    const payload = verifyToken(token, this.key);
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const used = await this.prisma.operationLog.findFirst({
      where: { operation: "SHORTLINK_USE", tokenHash },
    });
    if (used) {
      throw new UnauthorizedException("短链已使用或失效");
    }
    return { ...payload, tokenHash };
  }
}
