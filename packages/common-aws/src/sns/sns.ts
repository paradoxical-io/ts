import { PublishCommand, PublishCommandOutput, SNSClient } from '@aws-sdk/client-sns';
import { timed } from '@paradoxical-io/common';

import { Logger, Metrics, Monitoring, noOpMonitoring } from '../monitoring';

export class SNSManager {
  static newSNSClient() {
    return new SNSClient();
  }

  private readonly logger: Logger;

  readonly metrics: Metrics;

  constructor({
    sns = new SNSClient(),
    monitoring = noOpMonitoring(),
  }: {
    sns?: SNSClient;
    monitoring?: Monitoring;
  } = {}) {
    this.sns = sns;
    this.logger = monitoring.logger;
    this.metrics = monitoring.metrics;
  }

  private readonly sns: SNSClient;

  /**
   * Sends an SMS message
   * @param phoneNumber The number to send to
   * @param message The message
   * @param opts Configuration options that map to AWS SNS options such as Promotional or Transactional.
   *        More documentation for these fields is available on the aws-sdk website
   */
  @timed({ stat: 'aws_sns.delay_ms', tags: { method: 'publishSMS' } })
  async sendSMS(
    phoneNumber: string,
    message: string,
    opts: { mode: 'Transactional' | 'Promotional' } = { mode: 'Promotional' }
  ): Promise<PublishCommandOutput> {
    this.logger.with({ phoneNumber }).info(`Sending SNS message to number: '${message}'`);

    const command = new PublishCommand({
      Message: message,
      PhoneNumber: phoneNumber,
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: opts.mode,
        },
      },
    });

    return this.sns.send(command);
  }
}
