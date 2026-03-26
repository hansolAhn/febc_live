export interface OtpSendPayload {
  phone: string;
  code: string;
  purpose: "LOGIN";
}

export interface OtpProvider {
  send(payload: OtpSendPayload): Promise<void>;
}
