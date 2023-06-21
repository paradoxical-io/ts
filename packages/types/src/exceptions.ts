export class NotImplementedError extends Error {
  readonly ticketUrl: string;

  constructor(ticketUrl: string) {
    super(`Not Implemented: ${ticketUrl}`);
    this.ticketUrl = ticketUrl;
  }
}
