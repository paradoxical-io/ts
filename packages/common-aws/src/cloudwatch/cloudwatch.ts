import Cloudwatch = require('aws-sdk/clients/cloudwatchlogs');
import { log } from '@paradox/common-server';
import { Brand, EpochMS } from '@paradox/types';

import { awsRethrow } from '../errors';

export type CloudwatchExportTaskId = Brand<'TaskId', string>;

export class CloudwatchManager {
  constructor(private cloudwatch: Cloudwatch = new Cloudwatch()) {}

  /**
   * Create a new task to export a log group to an S3 bucket.
   * @param s3Bucket bucket to store log groups to
   * @param s3PathPrefix path prefix to include in destination. can be utilized to create a filepath.
   * @param logGroupName name of the log group in cloudwatch to export
   * @param from starting timestamp of logs to include
   * @param to ending timestamp of logs to include
   */
  async createExportTask({
    s3Bucket,
    s3PathPrefix,
    logGroupName,
    from,
    to,
  }: {
    s3Bucket: string;
    s3PathPrefix?: string;
    logGroupName: string;
    from: EpochMS;
    to: EpochMS;
  }): Promise<CloudwatchExportTaskId | undefined> {
    log.info(`Creating export task for ${logGroupName} from ${from} to ${to}`);

    /**
     * validate that we have at least 1 log event to export within the time range.
     * if we don't, do nothing otherwise we'll get an exception when calling
     * createExportTask(...)
     */
    const logEvents = await this.cloudwatch
      .filterLogEvents({
        endTime: to,
        limit: 1,
        logGroupName,
        startTime: from,
      })
      .promise()
      .catch(awsRethrow());

    if ((logEvents.events ?? []).length > 0) {
      const { taskId } = await this.cloudwatch
        .createExportTask({
          destination: s3Bucket,
          destinationPrefix: s3PathPrefix,
          logGroupName,
          from,
          to,
        })
        .promise()
        .catch(awsRethrow());

      return taskId as CloudwatchExportTaskId;
    }

    log.info(`No log events found for ${logGroupName} from ${from} to ${to}`);

    return undefined;
  }

  /**
   * Get details about a known cloudwatch export task
   * @param taskId
   */
  async describeExportTask(taskId: CloudwatchExportTaskId): Promise<Cloudwatch.ExportTask | undefined> {
    const { exportTasks } = await this.cloudwatch
      .describeExportTasks({
        taskId,
      })
      .promise()
      .catch(awsRethrow());

    if ((exportTasks ?? []).length > 0) {
      return exportTasks![0];
    }

    return undefined;
  }

  async getLogGroups(): Promise<Cloudwatch.LogGroups> {
    const { logGroups } = await this.cloudwatch
      .describeLogGroups({
        // default limit set by SDK
        limit: 50,
      })
      .promise()
      .catch(awsRethrow());

    return logGroups ?? [];
  }
}
