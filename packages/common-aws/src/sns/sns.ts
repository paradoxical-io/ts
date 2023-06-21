import SNS = require('aws-sdk/clients/sns');
import { log, timed } from '@paradox/common-server';
import { AWSError } from 'aws-sdk';
import { PromiseResult } from 'aws-sdk/lib/request';

import { awsRethrow } from '../errors';

export class SNSManager {
  static newSNSClient() {
    return new SNS();
  }

  constructor(private sns: SNS = SNSManager.newSNSClient()) {}

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
  ): Promise<PromiseResult<SNS.PublishResponse, AWSError>> {
    log.with({ phoneNumber }).info(`Sending SNS message to number: '${message}'`);

    const params = {
      Message: message,
      PhoneNumber: phoneNumber,
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: opts.mode,
        },
      },
    };

    return this.sns.publish(params).promise().catch(awsRethrow());
  }
}
