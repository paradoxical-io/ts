import { currentEnvironment } from '@paradoxical-io/common-server';
import { Brand } from '@paradoxical-io/types';

export type DynamoTableName = Brand<string, 'DynamoTableName'>;

/**
 * Create a standard dynamo table name in the form of paradox.<env>.<name>
 * @param name the suffix of the name
 */
export function dynamoTableName(name: string): DynamoTableName {
  const env = currentEnvironment() === 'local' ? 'dev' : currentEnvironment();

  return `paradox.${env}.${name}` as DynamoTableName;
}

export function assertTableNameValid(name: string) {
  if (currentEnvironment() !== 'local' && !name.includes(`.${currentEnvironment()}.`)) {
    throw new Error(
      `Table name must include current environment name in the format of "paradox.<env>.<name>" as a safetynet. Name is ${name}`
    );
  }
}
