import * as joi from 'joi';

export const SFindIn = {
  pageName: joi
    .string()
    .required()
    .default('bannerTop2')
    .description('页面名称对应前端')
};

export const SFindOut = joi.object().keys({
  pageName: joi.array().items(
    joi.object().keys({
      pageName: joi
        .string()
        .required()
        .max(50)
        .description('页面名称对应前端'),
      img: joi
        .string()
        .required()
        .max(200)
        .description('img'),
      src: joi
        .string()
        .required()
        .max(200)
        .description('跳转连接')
    })
  )
});

export const SSwiperIn = {
  type: joi
    .string()
    .required()
    .description('广告类型'),
  areaId: joi
    .string()
    .required()
    .description('地区id')
};

export const SSwiperOut = joi.array().items(
  joi.object().keys({
    describe: joi
      .string()
      .required()
      .max(200)
      .description('banner名称'),
    path: joi
      .string()
      .required()
      .max(200)
      .description('跳转连接'),
    img: joi
      .string()
      .required()
      .max(200)
      .description('图片链接'),
    id: joi
      .string()
      .required()
      .max(200)
      .description('数据id')
  })
);
