import { ILang } from '../../lib/interfaces/auth';
module.exports = () => {
  return async function authVerify(ctx, next) {
    ctx.locale =
      ctx.request.header['accept-language'] === 'en-US' ? 'en-us' : 'zh-cn';
    const auth: ILang = await ctx.requestContext.getAsync('Lang');
    const { lang } = ctx.request.header;
    ctx.state.lang = auth.lang = lang || 'zh_hk';
    return next();
  };
};
