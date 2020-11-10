/*
 * @Author: 吴占超
 * @Date: 2019-08-27 16:58:43
 * @Last Modified by: 武彩平
 * @Last Modified time: 2019-11-22 15:59:45
 */
import { IWxAuth } from '../../lib/interfaces/auth';

async function checkVerify(ctx, token) {
  return new Promise((resolve, reject) => {
    ctx.app.jwt.verify(
      token,
      ctx.app.config.jwt.secret,
      async (err, decoded) => {
        if (err) {
          reject(err);
        }
        ctx.logger.info(decoded);
        resolve(decoded);
      }
    );
  });
}

module.exports = () => {
  return async function authVerify(ctx, next) {
    const { wxtoken } = ctx.request.header;
    if (wxtoken) {
      await checkVerify(ctx, wxtoken)
        .then(async (decoded: any) => {
          const auth: IWxAuth = await ctx.requestContext.getAsync('wxAuth');
          Object.assign(auth, decoded);
        })
        .catch(err => {
          return ctx.throw(401.1, 'login wxAuth error');
        });
      return next();
    } else {
      return ctx.throw(401.2, 'wxAuth error');
    }
  };
};
