/* tslint:disable:no-unused-expression no-empty */
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { SpecificationVersion, PactV4, LogLevel } from '@pact-foundation/pact';
import net = require('net');
import { generateMattMessage, parseMattMessage } from '../protocol';
import axios from 'axios';

chai.use(chaiAsPromised);

const { expect } = chai;
describe('Plugins - Foo Protocol', () => {
  const HOST = '127.0.0.1';

  describe('HTTP interface', () => {
    const pact = new PactV4({
      consumer: 'myconsumer',
      provider: 'myprovider',
      spec: SpecificationVersion.SPECIFICATION_VERSION_V4,
      logLevel: (process.env.LOG_LEVEL as LogLevel) || 'error',
    });
    it('returns a valid Foo message over HTTP', async () => {
      const mattRequest = `{"request": {"body": "hello"}}`;
      const mattResponse = `{"response":{"body":"world"}}`;

      await pact
        .addInteraction()
        .given('the Foo protocol exists')
        .uponReceiving('an Foo request to /foo')
        .usingPlugin({
          plugin: 'saf-go',
          version: '0.0.1',
        })
        .withRequest('POST', '/foo', (builder) => {
          builder.pluginContents('application/foo', mattRequest);
        })
        .willRespondWith(200, (builder) => {
          builder.pluginContents('application/foo', mattResponse);
        })
        .executeTest((mockserver) => {
          return axios
            .request({
              baseURL: mockserver.url,
              headers: {
                'content-type': 'application/foo',
                Accept: 'application/foo',
              },
              data: 'hello',
              method: 'POST',
              url: '/foo',
            })
            .then((res) => {
              expect(res.data).to.eq('world');
            });
        });
    });
  });

  xdescribe('Foo interface', () => {
    const pact = new PactV4({
      consumer: 'myconsumer',
      provider: 'myprovider',
      spec: SpecificationVersion.SPECIFICATION_VERSION_V4,
      logLevel: (process.env.LOG_LEVEL as LogLevel) || 'error',
    });

    describe('with Foo protocol', async () => {
      it('generates a pact with success', () => {
        const mattMessage = `{"request": {"body": "hellotcp"}, "response":{"body":"tcpworld"}}`;

        return pact
          .addSynchronousInteraction('a Foo message')
          .usingPlugin({
            plugin: 'saf-go',
            version: '0.0.2',
          })
          .withPluginContents(mattMessage, 'application/foo')
          .startTransport('foo', HOST)
          .executeTest(async (tc) => {
            const message = await sendMattMessageTCP('hello', HOST, tc.port);
            expect(message).to.eq('tcpworld');
          });
      });
    });
  });
});

const sendMattMessageTCP = (
  message: string,
  host: string,
  port: number
): Promise<string> => {
  const socket = net.connect({
    port: port,
    host: host,
  });

  const res = socket.write(generateMattMessage(message) + '\n');

  if (!res) {
    throw Error('unable to connect to host');
  }

  return new Promise((resolve) => {
    socket.on('data', (data) => {
      resolve(parseMattMessage(data.toString()));
    });
  });
};
