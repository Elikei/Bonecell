import * as fs from 'fs';
import * as path from 'path';
import * as NodeRsa from 'node-rsa';
import { Context, WebMiddleware, provide } from 'midway';
@provide()
export class Tripartite implements WebMiddleware {
  // @inject()
  // cthrow: (number: number, errJson: string) => any;

  resolve() {
    return async (ctx: Context, next: any) => {
      const header = ctx.request.header;
      // 校验header字段是否存在
      if (!header['request-signature']) {
        return ctx.throw(400, `sign signature undefined`);
      }
      if (!header['request-datetime']) {
        return ctx.throw(400, `sign datetime undefined`);
      }
      const signStr = `${ctx.params.businessId}${JSON.stringify(
        ctx.request.body
      )}${header['request-datetime']}`;
      const baseDir = __dirname.replace('/lib/services', '');
      const filePath = '../../config/keys/advokate_pub.pem';
      const privateKey = String(
        fs.readFileSync(path.join(baseDir, filePath), 'utf-8')
      );
      // 签名
      const key = new NodeRsa(privateKey, {
        signingScheme: 'sha256'
      });
      const sign = key.verify(
        signStr,
        header['request-signature'],
        'utf8',
        'base64'
      );
      if (!sign) {
        ctx.throw(401, `sign fail`);
      }
      console.log(sign);
      return next();
    };
  }
}
