import {
  CloudWatchLogsClient,
  CreateExportTaskCommand,
  DescribeExportTasksCommand,
  DescribeLogGroupsCommand,
  ExportTask,
  FilterLogEventsCommand,
  LogGroup,
} from '@aws-sdk/client-cloudwatch-logs';
import { log } from '@paradoxical-io/common-server';
import { Brand, EpochMS } from '@paradoxical-io/types';

export type CloudwatchExportTaskId = Brand<'TaskId', string>;

export class CloudwatchManager {
  constructor(private cloudwatch: CloudWatchLogsClient = new CloudWatchLogsClient()) {}

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
    const filterLogEventsCommand = new FilterLogEventsCommand({
      endTime: to,
      limit: 1,
      logGroupName,
      startTime: from,
    });

    const logEvents = await this.cloudwatch.send(filterLogEventsCommand);

    if ((logEvents.events ?? []).length > 0) {
      const createExportTaskCommand = new CreateExportTaskCommand({
        destination: s3Bucket,
        destinationPrefix: s3PathPrefix,
        logGroupName,
        from,
        to,
      });

      const { taskId } = await this.cloudwatch.send(createExportTaskCommand);

      return taskId as CloudwatchExportTaskId;
    }

    log.info(`No log events found for ${logGroupName} from ${from} to ${to}`);

    return undefined;
  }

  /**
   * Get details about a known cloudwatch export task
   * @param taskId
   */
  async describeExportTask(taskId: CloudwatchExportTaskId): Promise<ExportTask | undefined> {
    const command = new DescribeExportTasksCommand({
      taskId,
    });

    const { exportTasks } = await this.cloudwatch.send(command);

    if ((exportTasks ?? []).length > 0) {
      return exportTasks![0];
    }

    return undefined;
  }

  async getLogGroups(): Promise<LogGroup[]> {
    const command = new DescribeLogGroupsCommand({
      // default limit set by SDK
      limit: 50,
    });

    const { logGroups } = await this.cloudwatch.send(command);

    return logGroups ?? [];
  }
}
