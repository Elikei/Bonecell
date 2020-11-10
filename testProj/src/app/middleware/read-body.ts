/*
 * @Author: 吴占超
 * @Date: 2019-05-29 10:34:02
 * @Last Modified by: 吴占超
 * @Last Modified time: 2019-08-20 12:01:26
 * cmq用read body
 */
import { Context, WebMiddleware, provide, inject, init } from 'midway';
import { IncomingMessage } from 'http';
import { IEncryption, ETypeCrypt } from '../../lib/iocs/encryption';
import { ICmqBody } from '../../lib/interfaces/cmq-topic';
import * as _ from 'lodash';

@provide()
export class ReadBody implements WebMiddleware {
  @inject('encryption')
  private encryptionCMQ;

  private encryption: IEncryption;

  @init()
  async init() {
    this.encryption = await this.encryptionCMQ('cmq', ETypeCrypt.Decrypt);
  }

  resolve() {
    return async (ctx: Context, next: any) => {
      ctx.request.body = await reqRead(ctx.req, this.encryption);
      await next();
    };
  }
}

const reqRead = async (
  req: IncomingMessage,
  encryption: IEncryption
): Promise<ICmqBody> => {
  return new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', chunk => {
      data += chunk;
    });
    return req.on('end', () => {
      const result: ICmqBody = JSON.parse(data);
      _.set(result, 'msgBody', JSON.parse(result.msgBody));
      _.chain(result.msgBody)
        .keys()
        .filter(p => ['openid', 'amount', 'total_fee_cny'].includes(p))
        .forEach(p =>
          _.set(
            result.msgBody,
            p,
            encryption.decryptJse(_.get(result.msgBody, p))
          )
        )
        .value();
      return resolve(result);
    });
  });
};
