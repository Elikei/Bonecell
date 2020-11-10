import { inject, provide } from 'midway';
import { ConstAppSwiper, IAppSwiperModel } from '../models/app-swiper.model';
import { IBannerModel, ConstBanner } from '../models/banner.model';
import { BaseService } from '../../base/base.service';
import * as ICommon from '../interfaces/banner';
import { Op } from 'sequelize';

export interface IBannerService extends BannerService {}

@provide()
export class BannerService extends BaseService {
  @inject()
  private BannerModel: IBannerModel;

  @inject()
  private AppSwiperModel: IAppSwiperModel;
  /**
   * 分页查询列表
   */
  async find(param: ICommon.IFindIn): Promise<ICommon.IFindOut> {
    const pageNames = this._.split(param.pageName, ',');
    console.log(pageNames);
    const options: any = {
      attributes: [ConstBanner.IMG, ConstBanner.SRC, ConstBanner.PAGE_NAME],
      where: {
        pageName: {
          [Op.in]: pageNames
        }
      },
      order: ['orderNo']
    };
    const result: any = {};
    const resultList = await this.BannerModel.findAll(options);
    pageNames.forEach(pageName => {
      result[pageName] = [];
      resultList.forEach(element => {
        if (element.pageName === pageName) {
          result[pageName].push({
            pageName,
            img: element.img,
            src: element.src
          });
        }
      });
    });
    return result;
  }

  /**
   * 获取列表
   *
   * @param {Inter.IAddIn} param
   * @returns {Promise<Inter.IListOut>}
   * @memberof AppSwiperService
   */
  async swiper(param: ICommon.ISwiperIn): Promise<ICommon.ISwiperOut> {
    const options: any = {
      where: {
        ...param,
        enable: 2
      },
      attributes: [
        ConstAppSwiper.ID,
        ConstAppSwiper.IMG,
        ConstAppSwiper.DESCRIBE,
        ConstAppSwiper.PATH
      ],
      order: [[ConstAppSwiper.ORDER_NO, 'asc']]
    };
    const res = await this.AppSwiperModel.findAll(options);
    return res;
  }
}
