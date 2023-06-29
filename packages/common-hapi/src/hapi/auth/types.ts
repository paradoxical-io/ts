export interface ValidateFunctionResponse<T = unknown> {
  valid: boolean;
  credentials?: T;
}
