import * as joi from 'joi';

export const SFindListIn = {
  offset: joi
    .number()
    .default(0)
    .description('开始位置 默认值0'),
  limit: joi
    .number()
    .default(10)
    .description('取的条数 默认是10'),
  type: joi
    .string()
    .default(10)
    .description('猜你喜欢'),
  productClassId: joi.string().description('商品分类id'),
  areaId: joi.string().description('地区id')
};

export const SFindListOut = joi.object().keys({
  count: joi
    .number()
    .required()
    .description('条数'),
  rows: joi.array().items(
    joi.object().keys({
      id: joi.string().description('id'),
      code: joi.string().description('商品编码'),
      img: joi.string().description('列表加载用主要图片src'),
      detail: joi.string().description('介绍文本'),
      name: joi.string().description('商品名称'),
      purchaseLimit: joi
        .number()
        .description('购买限额 数字表示限购数量，0不限购'),
      shopId: joi.string().description('商户id'),
      integral: joi.number().description('积分'),
      availableStock: joi.number().description('可用库存数'),
      saleAmount: joi.number().description('销售价格'),
      marketAmount: joi.number().description('市场价格'),
      brandName: joi.string().description('品牌名稱'),
      type: joi
        .number()
        .description(
          '商品类型 [Entity 10 实物,Virtual 20 虚拟,GarageKit 30 手办类]'
        ),
      class: joi.string().description('商品样式，限购20,默认10')
    })
  )
});

export const SFindOneIn = {
  id: joi
    .string()
    .required()
    .default('10071')
    .description('id')
};
export const SFindOne = {};
export const SFindOneOut = joi.object().keys({
  id: joi.string().description('id'),
  code: joi.string().description('商品编码'),
  img: joi.string().description('列表加载用主要图片src'),
  introduceText: joi.string().description('介绍文本'),
  name: joi.string().description('商品名称'),
  purchaseLimit: joi.number().description('购买限额 数字表示限购数量，0不限购'),
  shopId: joi.string().description('商户id'),
  integral: joi.number().description('积分'),
  stockSum: joi.number().description('库存'),
  enable: joi
    .string()
    .description('商品上下架，预约状态，0:下架, 1:售卖, 2:预售, 3:虚拟商品'),
  price: joi.number().description('原价'),
  fanPrice: joi.number().description('粉丝价格'),
  type: joi
    .number()
    .description(
      '商品类型 [Virtual 10 虚拟商品,SelfMention 20 自提商品,Post 30 邮寄]'
    ),
  specs: joi.string().description('规格'),
  activityId: joi.string().description('活动id 10 默认，20 限量'),
  title: joi.string().description('标题'),
  detail: joi.object().keys({
    img: joi.string().description('图片'),
    introduceText: joi.string().description('介绍文本'),
    bigImg: joi.string().description('大图'),
    title: joi.string().description('标题')
  }),
  brand: joi
    .object()
    .keys({
      name: joi.string().description('品牌名稱'),
      title: joi.string().description('品牌標題')
    })
    .description('品牌')
});

export const SImportIn = {
  fileName: joi
    .string()
    .default(
      '/Users/josephine/Documents/advokate/advokate-fun-points-midway/src/app/public/excel.xlsx'
    )
    .description('文件全路径')
};

export const SScanCodeIn = {
  code: joi
    .string()
    .required()
    .description('商家code')
};
export const SScanCodeOut = joi.object().keys({
  count: joi
    .number()
    .required()
    .description('条数'),
  rows: joi.array().items({})
});

export const SClassIn = {
  productClassId: joi
    .string()
    .allow(null)
    .allow('')
    .description('商品分类id，不传查询第一级')
};
export const SClassOut = joi.object().keys({
  id: joi.string().description('分类id'),
  name: joi.string().description('分类名称'),
  img: joi.string().description('分类图片')
});
