import Client = require('ssh2-sftp-client');
import stream from 'stream';

class ConnectedSftp {
  constructor(private client: Client) {}

  async write(path: string, data: stream.Readable): Promise<void> {
    await this.client.put(data, path);
  }

  async listFiles(path: string): Promise<string[]> {
    const files = await this.client.list(path);

    return files.map(i => i.name);
  }

  async getFile(path: string): Promise<stream.Readable> {
    const pass = new stream.PassThrough({});

    await this.client.get(path, pass);

    return pass;
  }
}

export class Sftp {
  constructor(private opts: { host: string; port?: number }) {}

  async connect(username: string, password: string): Promise<ConnectedSftp> {
    const client = new Client();

    await client.connect({
      host: this.opts.host,
      port: this.opts.port,
      username,
      password,
    });

    return new ConnectedSftp(client);
  }
}
