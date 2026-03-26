export interface AuthenticatedUserContext {
  accessToken: string;
  userId: string;
  branchId: string;
  roleCode: string;
  sessionKey: string;
}
