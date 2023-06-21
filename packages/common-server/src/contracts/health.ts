export interface HealthCheck {
  healthCheck(): Promise<boolean>;
}
