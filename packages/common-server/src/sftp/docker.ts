import { Docker, newDocker } from '../test/docker';

export async function newSftpDocker(
  username = 'username',
  pass = 'pass',
  folder = 'upload'
): Promise<{ container: Docker; host: string; port: number }> {
  const container = await newDocker({
    image: 'atmoz/sftp:alpine-3.7',
    exposePorts: [22],
    cmd: [`${username}:${pass}:::${folder}`],
  });

  await container.waitForPort(container.mapping[22]);

  return {
    container,
    port: container.mapping[22],
    host: 'localhost',
  };
}
