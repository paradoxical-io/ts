export class ProvidedConfigError extends Error {
  constructor(public providerType: string, message?: string) {
    super(message);
    this.name = ProvidedConfigError.name;
  }
}
