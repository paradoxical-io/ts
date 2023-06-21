import Dockerode, { Container } from 'dockerode';
import * as portfinder from 'portfinder';

export interface DockerCreate {
  image: string;
  cmd?: string[];
  env?: { [key: string]: string };
  /**
   * Expose ports to proxy. For example, if your container requires port 8000 add [8000] here
   * These ports will be mapped to a dynamically available open port on the host
   */
  exposePorts?: number[];
}

export interface PortMapping {
  [sourcePort: number]: number;
}

export async function newDocker(opts: DockerCreate): Promise<Docker> {
  const mappings: PortMapping = {};

  const portBindings: { [port: string]: Array<{ HostPort: string }> } = {};

  // find a set of open ports and map them to the docker container
  if (opts.exposePorts) {
    const openPorts = await new Promise<number[]>(resolve =>
      portfinder.getPorts(opts.exposePorts!.length, { port: Math.floor(Math.random() * 10000) + 8000 }, (err, ports) =>
        resolve(ports)
      )
    );

    let i = 0;
    for (const port of opts.exposePorts) {
      mappings[port] = openPorts[i];
      i++;
      portBindings[`${port}/tcp`] = [{ HostPort: mappings[port].toString() }];
    }
  }

  const docker = new Dockerode();

  await docker.pull(opts.image, {});

  const container = await docker.createContainer({
    Image: opts.image,
    Cmd: opts.cmd,
    AttachStderr: true,
    AttachStdout: true,
    Env: opts.env ? Object.keys(opts.env).map(k => `${k}=${opts.env![k]}`) : undefined,
    HostConfig: {
      PortBindings: portBindings,
    },
  });

  await container.start();

  return new Docker(mappings, container);
}

export class Docker {
  constructor(public mapping: PortMapping, private container: Container) {}

  async close() {
    await this.container.kill();
    await this.container.remove();
  }

  async waitForPort(port: number): Promise<void> {
    // checks to see if the port we want to have a listener on is ready
    const portReady = () =>
      new Promise((r, reject) => {
        portfinder.getPort(
          {
            port,
            stopPort: port + 1,
          },
          (err, found) => {
            if (err) {
              reject(err);
            }
            // the port we are waiting for is not available so its not open
            // we only looked at the port and the next port, so if we didn't find the port
            // then its in use
            else if (found !== port) {
              r(port);
            } else {
              reject(new Error('Port is still open'));
            }
          }
        );
      });

    while (true) {
      try {
        await portReady();

        return;
      } catch {
        // continue
      }
    }
  }

  async waitForLogs(target: string | RegExp): Promise<boolean> {
    const logs = await this.container.logs({
      follow: true,
      stdout: true,
      stderr: true,
    });

    return new Promise<boolean>((resolve, reject) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        logs.on('data', (chunk: any) => {
          if (chunk.toString().search(target) >= 0) {
            // @ts-ignore
            logs.destroy();

            logs.removeAllListeners();

            resolve(true);
          }
        });

        logs.on('end', () => resolve(false));
      } catch (e) {
        reject(e);
      }
    });
  }
}
