import { inject, provide, config, logger, init } from 'midway';
import { BaseService } from '../../base/base.service';
import * as ICommon from '../interfaces/product';
import {
  IProductRecommendDetailModel,
  ConstProductRecommendDetail
} from '../models/product-recommend-detail.model';
import { ITaskService } from './biz/task';
import { IAuth } from '../interfaces/auth';
import { IMiddlePlatformService } from './biz/middle-platform';
import { IAppUserLogModel } from '../models/app-user-log.model';
// 新表
import {
  IAppProductModel,
  EEnable,
  ConstAppProduct
} from '../models/app-product.model';
import {
  IAppProductLangModel,
  ConstAppProductLang
} from '../models/app-product-lang.model';
import {
  IAppProductPriceModel,
  ConstAppProductPrice
} from '../models/app-product-price.model';
import { IAppBrandModel, ConstAppBrand } from '../models/app-brand.model';
import {
  IAppBrandLangModel,
  ConstAppBrandLang
} from '../models/app-brand-lang.model';
import { IAppShopModel, ConstAppShop } from '../models/app-shop.model';
import {
  ConstAppProductClassLang,
  IAppProductClassLangModel
} from '../models/app-product-class-lang.model';
import {
  ConstAppProductClass,
  IAppProductClassModel
} from '../models/app-product-class.model';
import { Op } from 'sequelize';

export interface IProductService extends ProductService {}

@provide()
export class ProductService extends BaseService {
  @inject()
  private ProductRecommendDetailModel: IProductRecommendDetailModel;

  @inject()
  private taskService: ITaskService;

  @inject('Auth')
  private auth: IAuth;

  @inject()
  private AppBrandModel: IAppBrandModel;

  @inject()
  private middlePlatformService: IMiddlePlatformService;

  @config('middlePlatform')
  private middlePlatform: any;

  @inject()
  private AppUserLogModel: IAppUserLogModel;

  @logger()
  logger: any;

  // 新表
  @inject()
  private AppProductModel: IAppProductModel;

  @inject()
  private AppProductLangModel: IAppProductLangModel;

  @inject()
  private AppProductPriceModel: IAppProductPriceModel;

  @inject()
  private AppBrandLangModel: IAppBrandLangModel;

  @inject()
  private AppShopModel: IAppShopModel;

  @inject()
  private AppProductClassLangModel: IAppProductClassLangModel;

  @inject()
  private AppProductClassModel: IAppProductClassModel;

  // 商品关联关系
  private productRel: any;
  // 商品查询的字段
  private productAttributes: any;

  @init()
  async init() {
    this.productRel = [
      {
        model: this.AppProductPriceModel,
        attributes: [
          ConstAppProductPrice.SALE_AMOUNT,
          ConstAppProductPrice.MARKET_AMOUNT
        ],
        required: true
      },
      {
        model: this.AppProductLangModel,
        where: {
          lang: this.lang.lang
        },
        attributes: [ConstAppProductLang.CONTENT, ConstAppProductLang.TYPE],
        required: true
      },
      {
        model: this.AppBrandModel,
        attributes: [ConstAppBrand.LOGO],
        required: true,
        include: {
          model: this.AppBrandLangModel,
          where: {
            lang: this.lang.lang
          },
          attributes: [ConstAppBrandLang.CONTENT, ConstAppProductLang.TYPE],
          required: true
        }
      }
    ];

    this.productAttributes = [
      ConstAppProduct.ID,
      ConstAppProduct.BRAND_ID,
      ConstAppProduct.CODE,
      ConstAppProduct.IMG,
      ConstAppProduct.INTEGRAL,
      ConstAppProduct.SHOP_ID,
      ConstAppProduct.PURCHASE_LIMIT,
      ConstAppProduct.ENABLE,
      ConstAppProduct.AVAILABLE_STOCK,
      ConstAppProduct.TYPE,
      ConstAppProduct.UPDATED_AT,
      ConstAppProduct.CLASS,
      ConstAppProduct.CREATED_AT
    ];
  }

  /**
   * 商品列表，增加为你推荐
   */
  async findList(param: ICommon.IFindListIn): Promise<ICommon.IFindListOut> {
    // 根据地区id查询店铺id，作为过滤条件
    let shopList = [];
    if (param.areaId) {
      shopList = await this.AppShopModel.findAll({
        where: { areaId: param.areaId },
        attributes: [ConstAppShop.ID]
      });
    }
    if (this._.includes(['10', '20'], param.type)) {
      const options: any = {
        where: { productRecommendId: param.type },
        attributes: [
          ConstProductRecommendDetail.PRODUCT_ID,
          ConstProductRecommendDetail.CREATED_AT
        ],
        include: [
          {
            model: this.AppProductModel,
            where: {
              enable: EEnable.OnTheShelf
            },
            attributes: this.productAttributes,
            include: this.productRel,
            required: true
          }
        ],
        order: [['createdAt', 'desc']],
        distinct: true
      };
      const result: any = await this.ProductRecommendDetailModel.findAndCountAll(
        options
      );
      if (shopList && shopList.length > 0) {
        options.include[0].where = {
          ...options.include[0].where,
          shopId: { [Op.in]: this._.map(shopList, 'id') }
        };
      }
      // 遍历数据
      result.rows = result.rows.map(row => {
        return this._fromatProduct(row.product);
      });
      return result;
    }
    const options: any = {
      where: { enable: EEnable.OnTheShelf },
      attributes: this.productAttributes,
      include: this.productRel,
      order: [[ConstAppProduct.CREATED_AT, 'desc']],
      limit: Number(param.limit),
      offset: this._.toInteger(this._.get(param, 'offset', 0)),
      distinct: true
    };
    if (param.productClassId) {
      // 分类查询
      const list = await this.productClassQuery([param.productClassId]);
      list &&
        list.length > 0 &&
        (options.where.productTypeId = { [Op.in]: list });
    }
    if (shopList && shopList.length > 0) {
      options.where = {
        ...options.where,
        shopId: { [Op.in]: this._.map(shopList, 'id') }
      };
    }
    // 开始查询
    const res: any = await this.AppProductModel.findAndCountAll(options);
    // const count: any = await this.AppProductModel.count({
    //   where: options.where,
    //   include: options.include
    // });
    // console.log(1);
    // 遍历数据
    res.rows = res.rows.map(row => {
      return this._fromatProduct(row);
    });
    return res;
  }

  async productClassQuery(ids) {
    let list = ids;
    const options: any = {
      where: { pid: { [Op.in]: ids } },
      attributes: [ConstAppProductClass.ID]
    };
    const result = await this.AppProductClassModel.findAll(options);
    if (result && result.length > 0) {
      const res = await this.productClassQuery(result.map(p => p.id));
      list = this._.concat(list, res);
    }
    return list;
  }

  /**
   * 商品详情
   */
  async findOne(param: ICommon.IFindOneIn): Promise<ICommon.IFindOneOut> {
    const row: any = await this.AppProductModel.findOne({
      where: {
        id: param.id,
        enable: EEnable.OnTheShelf
      },
      attributes: this.productAttributes,
      include: this.productRel
    });
    // 推送到cmq 浏览商品任务添加
    this.auth &&
      this.auth.id &&
      (await this.taskService.pushTaskToCmq({
        userId: this.auth.id,
        address: this.auth.address,
        mark: 'browseProductWeek',
        productId: param.id
      }));
    return this._fromatProduct(row);
  }

  /**
   * 扫码领金币
   */
  async scanCode(param: ICommon.IScanCodeIn): Promise<ICommon.IScanCodeOut> {
    const res = await this.AppShopModel.findOne({
      where: { code: param.code },
      attributes: [ConstAppShop.ID, ConstAppShop.NAME, ConstAppShop.LOGO],
      raw: true
    });
    if (!res) {
      this.cthrow(511, '商家信息错误');
    }

    // 校验是否获取过99金币
    const log = await this.AppUserLogModel.findOne({
      where: {
        userId: this.auth.id,
        type: 'scanCode',
        businessId: param.code
      }
    });
    if (!log) {
      // 没获取得到金币奖励
      await this.middlePlatformService.call({
        eventId: this.middlePlatform.task.scanCode,
        weUnionId: this.auth.address,
        businessNo: param.code
      });
      // 保存合并记录
      await this.AppUserLogModel.create({
        userId: this.auth.id,
        type: 'scanCode',
        businessId: param.code
      });
    }
    // 关联查询商家商品信息
    const products = await this.AppProductModel.findAll({
      where: {
        shopId: res.id,
        enable: EEnable.OnTheShelf
      },
      attributes: this.productAttributes,
      include: this.productRel,
      order: [[ConstAppProduct.CREATED_AT, 'desc']]
    });
    res.product = products.map(item => {
      return this._fromatProduct(item);
    });
    return res;
  }

  async class(param: ICommon.IClassIn): Promise<ICommon.IClassOut> {
    const options: any = {
      where: {},
      attributes: [ConstAppProductClass.ID, ConstAppProductClass.IMG],
      include: [
        {
          model: this.AppProductClassLangModel,
          attributes: [
            ConstAppProductClassLang.LANG,
            ConstAppProductClassLang.CONTENT,
            ConstAppProductClassLang.TYPE
          ],
          where: {
            lang: this.lang.lang
          },
          required: true
        }
      ]
    };
    options.where.pid = param.productClassId || '0';
    let result = await this.AppProductClassModel.findAll(options);
    result.map(p => {
      p.dataValues.name = p.productClassLang.map(lang => lang.content)[0];
      p.dataValues.productClassLang = undefined;
      return p;
    });
    result = [
      {
        id: param.productClassId || '0',
        name: this.lang.lang === 'zh_cn' ? '全部' : 'All',
        img: null
      },
      ...result
    ];

    return result;
  }

  /**
   * 格式化商品字段信息
   *
   * @private
   * @param {*} item
   * @returns
   * @memberof ProductService
   */
  private _fromatProduct(item: any): any {
    return {
      id: item.id,
      brandName: item.brand.lang.find(i => i.type === 'name').content,
      code: item.code,
      saleAmount: Math.floor(item.price.saleAmount * 10000) / 10000,
      marketAmount: Math.floor(item.price.marketAmount * 10000) / 10000,
      img: item.img,
      integral: item.integral,
      name: item.productLang.find(i => i.type === 'name').content,
      detail: item.productLang.find(i => i.type === 'detail').content,
      purchaseLimit: item.purchaseLimit,
      shopId: item.shopId,
      availableStock: item.availableStock,
      type: item.type,
      class: item.class
    };
  }
}
