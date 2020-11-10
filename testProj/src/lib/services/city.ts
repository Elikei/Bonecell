import { inject, provide } from 'midway';
import { BaseService } from '../../base/base.service';
import * as ICommon from '../interfaces/city';
import { RequestOptions } from 'urllib';
import { IAppCityModel, ConstAppCity } from '../models/app-city.model';

export interface ICityService extends CityService {}

@provide()
export class CityService extends BaseService {
  @inject()
  private AppCityModel: IAppCityModel;

  @inject()
  private curl: (url: string, option: RequestOptions) => Promise<any>;

  async getList(param: ICommon.IGetListIn): Promise<ICommon.IGetListOut> {
    !param.pid && (param.pid = '5000001');
    console.log(param);
    return this.AppCityModel.findAndCountAll({
      attributes: [ConstAppCity.ID, ConstAppCity.PID, ConstAppCity.NAME],
      where: {
        pid: param.pid
      }
    });
  }
  async import(param: any): Promise<any> {
    // https://www.sf-express.com/sf-service-owf-web/service/region/new/A000810000/subRegions?level=2&lang=tc&region=hk&translate=tc
    const list = [];
    let i = 0;
    const parent = await this.curl(
      `https://www.sf-express.com/sf-service-owf-web/service/region/new/A000810000/subRegions?level=2&lang=tc&region=hk&translate=tc`,
      {
        method: 'GET',
        dataType: 'json'
      }
    );
    const list1: any = this._.chain(parent.data).map(s => {
      console.log(s);
      i = i + 1;
      return {
        id: 9000000 + i,
        name: s.name,
        pid: '9000000',
        level: 2
      };
    });
    list.push(...list1);
    // for (const p of parent.data) {
    for (let index = 0; index < parent.data.length; index++) {
      const p = parent.data[index];
      let sub = await this.curl(
        `https://www.sf-express.com/sf-service-owf-web/service/region/new/${p.code}/subRegions?level=${p.level}&lang=tc&region=hk&translate=tc`,
        {
          method: 'GET',
          dataType: 'json'
        }
      );
      sub = this._.chain(sub.data).map(s => {
        i = i + 1;
        return {
          id: 9000000 + i,
          name: s.name,
          pid: 9000001 + index,
          level: 3
        };
      });
      list.push(...sub);
    }
    await this.AppCityModel.bulkCreate(list);
    return list;
  }
}
