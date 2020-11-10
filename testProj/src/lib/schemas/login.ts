import * as joi from 'joi';

export const SCaptchaIn = {
  phone: joi
    .string()
    .required()
    .description('手机号'),
  captcha: joi
    .string()
    .required()
    .max(6)
    .description('验证码'),
  nationcode: joi
    .string()
    .required()
    .max(10)
    .description('区号 86 852'),
  activityId: joi.string().description('活动id'),
  shareId: joi.string().description('分享人id'),
  shareType: joi.string().description('分享人类型 mohe')
};
export const SCaptchaOut = joi.object().keys({
  phone: joi
    .string()
    .max(20)
    .description('电话号'),
  nickName: joi.string().description('昵称'),
  avatar: joi.string().description('头像'),
  authorization: joi.string().description('authorization'),
  showGift: joi.boolean().description('是否展示领取礼物截图'),
  email: joi.string().description('email'),
  emailPop: joi.number().description('是否弹出email [1 弹出,0 不弹出]')
});

export const SFacebookIn = {
  id: joi
    .string()
    .required()
    .description('facebook.id'),
  firstName: joi.string().description('facebook.first_name'),
  lastName: joi.string().description('facebook.last_name'),
  name: joi.string().description('facebook.name'),
  picture: joi.string().description('facebook.picture'),
  thumbnail: joi.string().description('facebook.thumbnail'),
  activityId: joi.string().description('活动id')
};
export const SFacebookOut = joi.object().keys({
  phone: joi.boolean().description('电话号为false走绑定手机号接口'),
  nickName: joi.string().description('昵称'),
  avatar: joi.string().description('头像'),
  authorization: joi.string().description('authorization'),
  showGift: joi.boolean().description('是否展示领取礼物截图'),
  email: joi.string().description('email'),
  emailPop: joi.number().description('是否弹出email [1 弹出,2 不弹出]')
});

export const SPasswordIn = {
  phone: joi
    .string()
    .required()
    .description('手机号'),
  password: joi
    .string()
    .required()
    .description('密码'),
  activityId: joi.string().description('活动id')
};
export const SPasswordOut = joi.object().keys({
  phone: joi
    .string()
    .max(20)
    .description('电话号'),
  nickName: joi.string().description('昵称'),
  avatar: joi.string().description('头像'),
  authorization: joi.string().description('authorization'),
  showGift: joi.boolean().description('是否展示领取礼物截图'),
  email: joi.string().description('email'),
  emailPop: joi.number().description('是否弹出email [1 弹出,0 不弹出]')
});

export const SBindInfoIn = {
  phone: joi
    .string()
    .required()
    .description('手机号'),
  captcha: joi
    .string()
    .required()
    .max(6)
    .description('验证码'),
  password: joi.string().description('密码'),
  nationcode: joi
    .string()
    .required()
    .max(10)
    .description('区号 86 852'),
  id: joi
    .string()
    .required()
    .description('facebook.id'),
  firstName: joi.string().description('facebook.first_name'),
  lastName: joi.string().description('facebook.last_name'),
  name: joi.string().description('facebook.name'),
  picture: joi.string().description('facebook.picture'),
  thumbnail: joi.string().description('facebook.thumbnail'),
  activityId: joi.string().description('活动id'),
  shareId: joi.string().description('分享人id'),
  shareType: joi.string().description('分享人类型 mohe')
};
export const SBindInfoOut = joi.object().keys({
  phone: joi
    .string()
    .max(20)
    .description('电话号'),
  nickName: joi.string().description('昵称'),
  avatar: joi.string().description('头像'),
  authorization: joi.string().description('authorization'),
  showGift: joi.boolean().description('是否展示领取礼物截图'),
  email: joi.string().description('email'),
  emailPop: joi.number().description('是否弹出email [1 弹出,0 不弹出]')
});

export const SBindFacebookIn = {
  id: joi
    .string()
    .required()
    .description('facebook.id'),
  firstName: joi.string().description('facebook.first_name'),
  lastName: joi.string().description('facebook.last_name'),
  name: joi.string().description('facebook.name'),
  picture: joi.string().description('facebook.picture'),
  thumbnail: joi.string().description('facebook.thumbnail')
};
export const SBindFacebookOut = joi.object().keys({
  id: joi.string().description('id')
});

export const SSendCaptchaIn = {
  phone: joi
    .string()
    .required()
    .max(20)
    .description('手机号码'),
  nationcode: joi
    .string()
    .required()
    .max(10)
    .description('区号'),
  use: joi
    .number()
    .required()
    .description(
      '验证码用途[register 1 注册,forgetPassword 2 忘记密码,login 3 登录,bindPhone 4 绑定手机号]'
    )
};
export const SSendCaptchaOut = joi.object().keys({
  phone: joi
    .string()
    .required()
    .description('手机号')
});

export const SPhoneRegisterIn = {
  phone: joi
    .string()
    .required()
    .max(20)
    .description('手机号'),
  verification: joi
    .string()
    .max(10)
    .required()
    .description('验证码'),
  password: joi
    .string()
    .required()
    .description('密码'),
  nationcode: joi
    .string()
    .required()
    .max(10)
    .description('区号 86 852'),
  activityId: joi.string().description('活动id'),
  shareId: joi.string().description('分享人id'),
  shareType: joi.string().description('分享人类型 mohe'),
  lang: joi.string().description('语言')
};
export const SPhoneRegisterOut = joi.object().keys({
  phone: joi
    .string()
    .max(20)
    .description('电话号'),
  nickName: joi.string().description('昵称'),
  avatar: joi.string().description('头像'),
  authorization: joi.string().description('authorization'),
  showGift: joi.boolean().description('是否展示领取礼物截图'),
  email: joi.string().description('email'),
  emailPop: joi.number().description('是否弹出email [1 弹出,0 不弹出]')
});

// 电话创建
export const SPhoneEditIn = {
  phone: joi
    .string()
    .required()
    .max(20)
    .description('手机号'),
  verification: joi
    .string()
    .max(10)
    .required()
    .description('验证码'),
  password: joi
    .string()
    .required()
    .description('密码'),
  // nickname: joi.string().description('用户名'),
  nationcode: joi
    .string()
    .required()
    .max(10)
    .description('区号 86 852'),
  activityId: joi.string().description('活动id')
};

export const SPhoneEditOut = joi.object().keys({
  phone: joi
    .string()
    .max(20)
    .description('电话号'),
  nickName: joi.string().description('昵称'),
  avatar: joi.string().description('头像'),
  authorization: joi.string().description('authorization'),
  showGift: joi.boolean().description('是否展示领取礼物截图'),
  email: joi.string().description('email'),
  emailPop: joi.number().description('是否弹出email [1 弹出,0 不弹出]')
});

export const SStDecryptIn = joi.object().keys({
  str: joi
    .string()
    .required()
    .description('加密字符串')
});

export const STripartiteLoginIn = {
  uid: joi
    .string()
    .required()
    .description('三方系统用户id'),
  source: joi
    .string()
    .required()
    .description('三方系统来源（线下获取）'),
  phone: joi
    .string()
    .required()
    .description('用户手机号'),
  businessId: joi
    .string()
    .required()
    .description('业务id')
};

export const STripartiteLoginOut = joi.object().keys({});

export const SUserNameIn = {
  userName: joi
    .string()
    .required()
    .description('用户名'),
  passWord: joi
    .string()
    .required()
    .description('密码')
};
export const SUserNameOut = joi.object().keys({
  id: joi
    .string()
    .required()
    .description('用户id'),
  nickName: joi
    .string()
    .required()
    .description('用户昵称'),
  shopId: joi
    .string()
    .allow('')
    .allow(null)
    .description('商家id'),
  authorization: joi
    .string()
    .required()
    .description('token')
});
