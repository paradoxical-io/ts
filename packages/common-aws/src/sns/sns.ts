import { PublishCommand, PublishCommandOutput, SNSClient } from '@aws-sdk/client-sns';
import { log, timed } from '@paradoxical-io/common-server';

export class SNSManager {
  static newSNSClient() {
    return new SNSClient();
  }

  constructor(private sns: SNSClient = new SNSClient()) {}

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
    log.with({ phoneNumber }).info(`Sending SNS message to number: '${message}'`);

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
