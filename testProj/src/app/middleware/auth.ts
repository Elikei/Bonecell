import { IAuth } from '../../lib/interfaces/auth';
/*
 * @Author: 吴占超
 * @Date: 2019-06-07 16:01:26
 * @Last Modified by: 张洪治
 * @Last Modified time: 2020-08-03 14:58:15
 * auth 创建
 */
async function checkVerify(ctx, token) {
  return new Promise((resolve, reject) => {
    /**
     * 用户独立到用户中心（UserCenter），积分中台自身不保存用户
     * 用户的token值，调用 UserCenter 的接口进行解码
     */
    // 从容器中取得curl的func实例
    ctx.requestContext
      .getAsync('curl')
      .then(curl => {
        // 用curl请求UserCenterApi的token解码地址
        return curl(`${ctx.app.config.userCenter.path}/token/pars`, {
          method: 'POST',
          dataType: 'json',
          headers: {
            authorization: token
          }
        });
      })
      .then(res => {
        // 解码成功，返回解码结果
        // res.data的结构 = {
        //   accountId: '主账号ID',
        //   accountSubIds: [子账号id列表],
        //   provider: 'u_center',
        //   onTime: '登录时间',
        //   sessionKey: '245',
        //   address: '区块链地址',
        //   loginAccountSubId: '当前登录的子账号id'
        // };
        // ctx.logger.info(JSON.stringify(token));
        // ctx.logger.info(JSON.stringify(res.data));
        resolve(res.data);
      })
      .catch(err => {
        // 解码失败，返回错误
        reject(err);
      });
  });
}

async function checkToken(ctx, token) {
  return new Promise((resolve, reject) => {
    ctx.app.jwt.verify(
      token,
      ctx.app.config.jwt.secret,
      async (err, decoded) => {
        if (err) {
          reject(err);
        }
        // ctx.logger.info(decoded);
        resolve(decoded);
      }
    );
  });
}

module.exports = () => {
  return async function authVerify(ctx, next) {
    const { authorization, token } = ctx.request.header;
    // 注册auth
    const auth: IAuth = await ctx.requestContext.getAsync('Auth');
    // 无authorization判断
    if (!authorization) {
      if (token) {
        await checkToken(ctx, token)
          .then(async (decoded: any) => {
            const auth: IAuth = await ctx.requestContext.getAsync('Auth');
            auth.id = decoded.id;
            auth.sessionKey = decoded.sessionKey;
            auth.provider = decoded.provider;
            auth.code = decoded.code;
            auth.onTime = decoded.onTime;
          })
          .catch(err => {
            return ctx.throw(401, { message: 'login error', code: 401.1 });
          });
        return next();
      }
      if (
        ctx.app.config.authMatch.matchNo.includes(ctx.path) ||
        new RegExp(/^\/api\/product\/+[0-9]+$/).test(ctx.path)
      ) {
        return next();
      }
      ctx.throw(401, { message: 'auth error', code: 401.2 });
      return next();
    }
    await checkVerify(ctx, authorization)
      .then(async (decoded: any) => {
        // 如果解密没有值
        !decoded && ctx.throw(401, { message: 'login error', code: 401.3 });
        // 如果解密错误，且是get接口
        // decoded.message &&
        //   (ctx.method !== 'GET' ||
        //     ctx.app.config.authVerify.indexOf(ctx.path) !== -1) &&
        //   ctx.throw(401, {
        //     message: `login error ${decoded.message}`,
        //     code: 401.1
        //   });
        decoded.message &&
          ctx.throw(401, {
            message: `login error ${decoded.message}`,
            code: 401.1
          });
        // 正确解密
        auth.id = decoded.loginAccountSubId;
        auth.accountId = decoded.accountId;
        auth.accountSubIds = decoded.accountSubIds;
        auth.address = decoded.address;
        auth.authorization = authorization;
        auth.sessionKey = decoded.sessionKey;
        auth.provider = decoded.provider;
        auth.code = decoded.code;
        auth.onTime = decoded.onTime;
        auth.phone = decoded.phone;
        const userModel = await ctx.requestContext.getAsync('AppUserModel');
        const user = await userModel.findOne({
          where: {
            phone: decoded.phone
          },
          attributes: ['id']
        });
        auth.id = user.id;
        ctx.logger.info('----auth----');
        ctx.logger.info(JSON.stringify(auth));
      })
      .catch(err => {
        ctx.logger.info(
          `===用户中心解密失败====== error info: ${JSON.stringify(err)}`
        );
        ctx.throw(401, { message: 'login error', code: 401.1 });
      });
    return next();
  };
};
