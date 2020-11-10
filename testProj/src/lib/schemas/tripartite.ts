import * as joi from 'joi';

const SBasicInfo = {
  uid: joi
    .string()
    .required()
    .description('三方系统用户id'),
  phone: joi
    .string()
    .required()
    .description('用户手机号')
};

export const STripartitePath = {
  businessId: joi
    .string()
    .required()
    .description('商户唯一标示')
};

export const SAuthorizationIn = {
  ...SBasicInfo,
  redirectNo: joi
    .boolean()
    .description('可不传  值为true 则返回登陆信息，不跳转到 GuuCube相关页面')
};

export const SAuthorizationOut = joi.object().keys({});

export const SCallIn = {
  uid: joi
    .string()
    .required()
    .description('三方系统用户id'),
  // source: joi
  //   .string()
  //   .required()
  //   .description('三方系统来源（线下获取）'),
  phone: joi
    .string()
    .required()
    .description('用户手机号'),
  val: joi
    .number()
    .required()
    .description('增发积分数量值'),
  eventId: joi
    .string()
    .required()
    .description('积分增发事件id'),
  transactionId: joi
    .string()
    .required()
    .description('三方业务交易id')
};

export const SCallOut = joi.object().keys({
  eventId: joi.string().description('积分增发事件id'),
  code: joi.number().description('状态码 成功1 失败0'),
  message: joi.string().description('请求返回信息')
});

export const SLoginIn = {
  ...SBasicInfo
};

export const SLoginOut = joi.object().keys({});

export const SCallBackIn = {};
export const SCallBackOut = joi.object().keys({
  count: joi
    .number()
    .required()
    .description('条数'),
  rows: joi.array().items({})
});

export const SGrantPointsIn = {
  val: joi
    .number()
    .required()
    .description('消费金额'),
  id: joi
    .string()
    .required()
    .description('用户id')
};
export const SGrantPointsOut = joi.object().keys({
  count: joi
    .number()
    .required()
    .description('条数'),
  rows: joi.array().items({})
});

export const SWriteOffIn = {
  id: joi.string().description('兑换码id')
};
export const SWriteOffOut = joi.object().keys({
  count: joi
    .number()
    .required()
    .description('条数'),
  rows: joi.array().items({})
});
