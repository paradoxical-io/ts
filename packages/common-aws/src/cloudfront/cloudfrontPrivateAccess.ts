import { CloudfrontSignedCookiesOutput, getSignedCookies } from '@aws-sdk/cloudfront-signer';
import { EpochSeconds } from '@paradox/types';

export type SignedCookiesResponse = CloudfrontSignedCookiesOutput;

interface Opts {
  /**
   * Url of cloudfront distribution
   */
  distributionUrl: string;

  /**
   * Private key loaded from SSM
   */
  privateKey: string;

  /**
   * ID of public key. Can be found in Cloudfront console in AWS
   */
  publicKeyId: string;
}

/**
 * Utility class used for granting access to private objects in a cloudfront distribution
 */
export class CloudfrontPrivateAccess {
  private readonly distributionUrl: string;

  private readonly publicKeyId: string;

  private readonly privateKey: string;

  constructor({ distributionUrl, privateKey, publicKeyId }: Opts) {
    this.distributionUrl = distributionUrl;
    this.privateKey = privateKey;
    this.publicKeyId = publicKeyId;
  }

  /**
   * Generate signed cookies to allow access to entire directory in S3 bucket attached to cloudfront distribution
   */
  async generateCookies(expires: EpochSeconds): Promise<CloudfrontSignedCookiesOutput> {
    return getSignedCookies({
      url: this.distributionUrl,
      keyPairId: this.publicKeyId,
      privateKey: this.privateKey,
      policy: JSON.stringify({
        // custom policy that allows for any object within the distribution to be accessed up until the expiration timestamp
        // https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-setting-signed-cookie-custom-policy.html
        Statement: [
          {
            Resource: 'https://*',
            Condition: {
              DateLessThan: {
                // aws expects this condition to be in seconds
                'AWS:EpochTime': expires,
              },
            },
          },
        ],
      }),
    });
  }
}
