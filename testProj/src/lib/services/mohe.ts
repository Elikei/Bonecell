import { inject, provide, config, logger } from 'midway';
import { BaseService } from '../../base/base.service';
import { IAuth } from '../interfaces/auth';
import { ISnowflakeId } from '../iocs/ctx-handler';
import { IDBContext } from '../models/dbcontext';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { IMoheModel, ConstMohe } from '../models/mohe.model';
import {
  IMoheItemModel,
  ConstMoheItem,
  EMoheItemType
} from '../models/mohe-item.model';
import {
  IMoheItemRecordModel,
  ConstMoheItemRecord
} from '../models/mohe-item-record.model';
import {
  IMoheItemStockModel,
  ConstMoheItemStock
} from '../models/mohe-item-stock.model';
import * as ICommon from '../interfaces/mohe';
import { IMiddlePlatformService } from './biz/middle-platform';
import { IMoheUserShareRecordModel } from '../models/mohe-user-share-record.model';
import { IAppUserLogModel } from '../models/app-user-log.model';
import { IAppExchangeCodeRecordModel } from '../models/app-exchange-code-record.model';

export interface IMoheService extends MoheService {}

@provide()
export class MoheService extends BaseService {
  @inject('Auth')
  private auth: IAuth;

  @inject()
  private MoheModel: IMoheModel;
  @inject()
  private MoheItemModel: IMoheItemModel;
  @inject()
  private MoheItemRecordModel: IMoheItemRecordModel;
  @inject()
  private MoheItemStockModel: IMoheItemStockModel;
  @inject()
  private MoheUserShareRecordModel: IMoheUserShareRecordModel;
  @inject()
  private AppUserLogModel: IAppUserLogModel;

  @inject()
  private AppExchangeCodeRecordModel: IAppExchangeCodeRecordModel;

  @inject()
  private middlePlatformService: IMiddlePlatformService;
  @inject()
  private snowflakeId: ISnowflakeId;
  @inject()
  private DBContext: IDBContext;
  @config('middlePlatform')
  private middlePlatform: any;
  @logger()
  logger: any;
  /**
   * find list
   */
  async findList(): Promise<ICommon.IFindListOut> {
    const list = await this.MoheModel.findAndCountAll({
      attributes: [ConstMohe.DESCRIPTION],
      include: [
        {
          model: this.MoheItemModel,
          as: 'itemInfo',
          attributes: [
            ConstMoheItem.NAME,
            ConstMoheItem.ICON,
            ConstMoheItem.TYPE_NAME,
            ConstMoheItem.SMALL_IMG
          ],
          order: [[ConstMoheItem.PROB_ORIGIN.toString(), 'asc']]
        }
      ]
    });
    return list;
  }

  async findRecord(param: any): Promise<ICommon.IFindRecordOut[]> {
    let records;
    if (this.auth && this.auth.id) {
      records = await this.MoheItemRecordModel.findAndCountAll({
        attributes: [
          ConstMoheItemRecord.ID,
          ConstMoheItemRecord.CREATED_AT,
          ConstMoheItemRecord.COST_COIN
        ],
        include: [
          {
            model: this.MoheItemModel,
            as: 'moheItemInfo',
            required: true,
            attributes: [
              ConstMoheItem.ICON,
              ConstMoheItem.NAME,
              ConstMoheItem.TYPE,
              ConstMoheItem.TYPE_NAME,
              ConstMoheItem.IMG,
              ConstMoheItem.SMALL_IMG
            ],
            include: [
              {
                model: this.MoheModel,
                as: 'moheInfo',
                required: true,
                attributes: [ConstMohe.ID]
              }
            ]
          }
        ],
        where: {
          userId: this.auth.id
        },
        offset: (Number(param.pageIndex) - 1) * Number(param.pageSize),
        limit: Number(param.pageSize),
        order: [[ConstMoheItemRecord.CREATED_AT.toString(), 'desc']]
      });

      if (records && records.rows && records.rows.length > 0) {
        records.rows = this._.chain(records.rows).map(record => {
          return {
            id: record.id,
            date: record.createdAt,
            name: record.moheItemInfo.name,
            smallImg: record.moheItemInfo.smallImg,
            img: record.moheItemInfo.img,
            icon: record.moheItemInfo.icon,
            type: record.moheItemInfo.type,
            typeName: record.moheItemInfo.typeName,
            showDetailButton: record.moheItemInfo.type !== EMoheItemType.coin
          };
        });
      }
    }

    return records;
  }
  async findRecordOne(id: string): Promise<ICommon.IFindRecordOneOut> {
    if (!this.auth || !this.auth.id) {
      this.cthrow(511, '用户未登录');
    }
    const recordStock = await this.MoheItemStockModel.findOne({
      attributes: [ConstMoheItemStock.REDEMPTION_CODE],
      include: [
        {
          model: this.MoheItemModel,
          as: 'moheItemInfo',
          required: true,
          attributes: [
            ConstMoheItem.ICON,
            ConstMoheItem.NAME,
            ConstMoheItem.TYPE_NAME,
            ConstMoheItem.TYPE,
            ConstMoheItem.IMG,
            ConstMoheItem.DESCRIPTION,
            ConstMoheItem.SMALL_IMG
          ],
          include: [
            {
              model: this.MoheModel,
              as: 'moheInfo',
              required: true,
              attributes: [ConstMohe.ID]
            }
          ],
          where: {
            type: EMoheItemType.v_goods
          }
        },
        {
          model: this.MoheItemRecordModel,
          as: 'itemRecordInfo',
          required: true,
          attributes: [ConstMoheItemRecord.CREATED_AT],
          include: [
            {
              model: this.MoheItemModel,
              as: 'moheItemInfo',
              required: true,
              attributes: [ConstMoheItem.ID],
              include: [
                {
                  model: this.MoheModel,
                  as: 'moheInfo',
                  required: true,
                  attributes: [ConstMohe.ID]
                }
              ],
              where: {
                type: EMoheItemType.v_goods
              }
            }
          ],
          where: {
            id,
            userId: this.auth.id
          }
        }
      ],
      where: {
        userId: this.auth.id
      }
    });

    if (!recordStock) {
      this.cthrow(511, '未找到當前用戶下的該獲獎記錄');
    }

    return {
      date: recordStock.itemRecordInfo.createdAt,
      name: recordStock.moheItemInfo.name,
      icon: recordStock.moheItemInfo.icon,
      smallImg: recordStock.moheItemInfo.smallImg,
      img: recordStock.moheItemInfo.img,
      description: recordStock.moheItemInfo.description,
      code: recordStock.redemptionCode,
      type: recordStock.moheItemInfo.type,
      typeName: recordStock.moheItemInfo.typeName
    };
  }

  async findFunPointsRecordOne(id: string): Promise<ICommon.IFindRecordOneOut> {
    if (!this.auth || !this.auth.id) {
      this.cthrow(511, '用户未登录');
    }
    const res = await this.MoheItemRecordModel.findOne({
      attributes: [ConstMoheItemRecord.CREATED_AT],
      include: [
        {
          model: this.MoheItemModel,
          as: 'moheItemInfo',
          required: true,
          attributes: [
            ConstMoheItem.ICON,
            ConstMoheItem.NAME,
            ConstMoheItem.TYPE_NAME,
            ConstMoheItem.TYPE,
            ConstMoheItem.IMG,
            ConstMoheItem.DESCRIPTION,
            ConstMoheItem.SMALL_IMG
          ],
          include: [
            {
              model: this.MoheModel,
              as: 'moheInfo',
              required: true,
              attributes: [ConstMohe.ID]
            }
          ],
          where: {
            type: EMoheItemType.coin
          }
        }
      ],
      where: {
        id,
        userId: this.auth.id
      }
    });
    if (!res) {
      this.cthrow(511, '未找到當前用戶下的該獲獎記錄');
    }

    return {
      date: res.createdAt,
      name: res.moheItemInfo.name,
      icon: res.moheItemInfo.icon,
      smallImg: res.moheItemInfo.smallImg,
      img: res.moheItemInfo.img,
      description: res.moheItemInfo.description,
      type: res.moheItemInfo.type,
      typeName: res.moheItemInfo.typeName
    };
  }
  async lottery(): Promise<ICommon.IlotteryOut> {
    if (!this.auth || !this.auth.id) {
      this.cthrow(511, '用户未登录');
    }
    // 查看是否还有可抽奖次数
    const mohe = await this.MoheModel.findOne({
      order: [[ConstMohe.CREATED_AT, 'desc']]
    });
    if (!mohe || !mohe.maxCount || !mohe.maxCount || !mohe.cost) {
      this.cthrow(512, '魔盒配置校验失败, 请检查!');
    }

    // 查看用户今日剩余抽奖次数
    // const userCount = await this.DBContext.sequelize.query(
    //   `select count(*) as count from mohe_item_record where deleted_at is null
    //     and user_id ='${this.auth.id}' and to_days(CREATED_AT) = to_days(now())
    //     and mohe_id = '${mohe.id}'`,
    //   {
    //     type: 'SELECT'
    //   }
    // );
    const usedCount = await this.MoheItemRecordModel.count({
      where: {
        userId: this.auth.id,
        moheId: mohe.id,
        [Op.and]: [
          Sequelize.where(
            Sequelize.literal('to_days(CREATED_AT)'),
            Sequelize.literal('to_days(now())')
          )
        ]
      }
    });
    const maxCount: number = this._.toNumber(mohe.maxCount);
    if (this._.toNumber(usedCount) >= maxCount) {
      this.cthrow(511, `今日你抽晒啦，聽日再嚟抽啦`);
    }

    const costArray = mohe.cost.split('|') as number[];
    const cost =
      costArray.length >= usedCount
        ? costArray[usedCount - 1 > 0 ? usedCount - 1 : 0]
        : 0;

    // todo: 这里需要进行中台事件的调用 => 消耗的 cost 积分
    // 传说币上链
    if (cost > 0) {
      //  fun points不足判斷
      const bonus = await this.middlePlatformService.balance({
        weUnionId: this.auth.address
      }); // balance
      this.logger.info(`cost = ${cost}`);
      if (bonus.balance < cost) {
        this.cthrow(
          511,
          '您的GuuCoin不足，無法購買，您可以參與簽到或使用傳說幣兌換獲取更多GuuCoin'
        );
      }
      await this.middlePlatformService.call({
        eventId: this.middlePlatform.task.luckDraw,
        weUnionId: this.auth.address,
        businessNo: mohe.id
      });
    }
    // 开始执行抽奖方法
    const rewordItem: any = await this.executeLottery(cost, mohe.id);
    this.logger.info(`rewordItem = ${JSON.stringify(rewordItem)}`);
    if (rewordItem.type === EMoheItemType.coin) {
      this.logger.info(
        `task = ${this.middlePlatform.task['winGold' + rewordItem.amount]}`
      );
      // todo: 这里需要进行中台事件的调用 => 如果获取金币, 获的  rewordItem.amount 数量的积分
      await this.middlePlatformService.call({
        eventId: this.middlePlatform.task['winGold' + rewordItem.amount],
        weUnionId: this.auth.address,
        businessNo: rewordItem.id
      });
    }

    return {
      id: rewordItem.recordId,
      type: rewordItem.dataValues.type,
      name: rewordItem.dataValues.name,
      icon: rewordItem.dataValues.icon
    };
  }

  private async executeLottery(cost: number, moheId: string) {
    // 查看该魔盒下的奖品
    const moheItems: Array<{
      id: string;
      name: string;
      icon: string;
      type: EMoheItemType;
      amount: number;
      probOrigin: number;
      probRealtime: number;
      stockOrigin: number;
      stockRealtime: number;
      smallImg: string;
    }> = await this.MoheItemModel.findAll({
      attributes: [
        ConstMoheItem.ID,
        ConstMoheItem.NAME,
        ConstMoheItem.ICON,
        ConstMoheItem.AMOUNT,
        ConstMoheItem.TYPE,
        ConstMoheItem.SMALL_IMG,
        ConstMoheItem.PROB_ORIGIN,
        ConstMoheItem.PROB_REALTIME,
        ConstMoheItem.STOCK_REALTIME,
        ConstMoheItem.STOCK_ORIGIN
      ],
      // 实时库存及概率大于0
      where: {
        moheId,
        [Op.or]: [
          {
            probRealtime: { [Op.gt]: 0 },
            stockRealtime: { [Op.gt]: 0 },
            type: 10
          },
          {
            probRealtime: { [Op.gt]: 0 },
            type: 20
          }
        ]
      }
    });
    this.logger.info(`LIST ===`);
    this.logger.info(JSON.stringify(moheItems));

    if (!moheItems || moheItems.length === 0) {
      this.cthrow(511, '无可用抽奖奖品');
    }
    // 判断是否总概率为 100
    let allProp = this._.sumBy(moheItems, x => this._.toNumber(x.probRealtime));
    console.log(allProp);
    if (allProp < 100) {
      // 将不足的概率添加到 奖励金币数量的奖项
      const obj = moheItems
        .filter(x => x.type === EMoheItemType.coin)
        .sort((x, y) => x.amount - y.amount)[0];
      moheItems.find(x => x.id === obj.id).probRealtime =
        Number(obj.probRealtime) + 100 - allProp;
    }

    if (allProp > 100) {
      // 将多出的概率优先减去虚拟商品, 之后按照金币的数量从大到小扣减
      let excessProp = allProp - 100;
      while (excessProp > 0) {
        // 虚拟商品优先
        let itmes = moheItems.filter(x => x.type === EMoheItemType.v_goods);
        for (const item of itmes || []) {
          if (Number(item.probRealtime) > excessProp) {
            item.probRealtime = Number(item.probRealtime) - excessProp;
            excessProp = 0;
          } else {
            excessProp -= this._.toNumber(item.probRealtime);
            item.probRealtime = 0;
            // 移除实际为 0 的奖项
            this._.remove(moheItems, x => x.id === item.id);
          }

          if (excessProp === 0) {
            break;
          }
        }

        // 金币
        if (excessProp > 0) {
          itmes = moheItems
            .filter(x => x.type === EMoheItemType.coin)
            .sort((x, y) => y.amount - x.amount);
          for (const item of itmes) {
            if (Number(item.probRealtime) > excessProp) {
              item.probRealtime = Number(item.probRealtime) - excessProp;
              excessProp = 0;
            } else {
              excessProp -= this._.toNumber(item.probRealtime);
              item.probRealtime = 0;
              // 移除实际为 0 的奖项
              this._.remove(moheItems, x => x.id === item.id);
            }

            if (excessProp === 0) {
              break;
            }
          }
        }
      }
    }

    // 随机函数, 进行抽奖
    allProp = this._.sumBy(moheItems, x => this._.toNumber(x.probRealtime));
    if (allProp !== 100) {
      this.cthrow(511, '計算錯誤, 概率平衡之後總概率不為100');
    }
    // 随机池, 考虑两位小数
    let randomArray: number[] = [];
    for (let index = 0; index < moheItems.length; index++) {
      const item = moheItems[index];
      const tempArray = Array(this._.floor(item.probRealtime * 100)).fill(
        index,
        0
      ) as number[];
      randomArray = this._.concat(randomArray, tempArray);
    }
    const rewardIndex = this._.random(0, randomArray.length, false);
    let moheItem = moheItems[randomArray[rewardIndex]];
    this.logger.info(JSON.stringify(moheItem));
    // 处理获奖结果
    const recordId = this.snowflakeId.create();
    let stockOne = null;
    if (moheItem.type === EMoheItemType.v_goods) {
      // 查询 stock
      stockOne = await this.MoheItemStockModel.findOne({
        where: {
          itemId: moheItem.id,
          redemptionCode: { [Op.not]: null },
          recordId: { [Op.is]: null },
          userId: { [Op.is]: null }
        }
      });
      this.logger.info(`stockOne = ${JSON.stringify(stockOne)}`);
      if (!stockOne) {
        // 库存错误, 这里强制改为获取最低的金币
        moheItem = moheItems
          .filter(x => x.type === EMoheItemType.coin)
          .sort((x, y) => x.amount - y.amount)[0];
      }
      if (moheItem.type === EMoheItemType.v_goods) {
        // Promise事务处理
        await this.DBContext.sequelize
          .transaction(t => {
            return Promise.all([
              this.DBContext.sequelize.query(`
          UPDATE mohe_item SET updated_at=now(), stock_realtime=stock_realtime-1, prob_realtime=ROUND(prob_origin*stock_realtime/stock_origin,2) WHERE id='${moheItem.id}';`),
              this.MoheItemStockModel.update(
                {
                  userId: this.auth.id,
                  recordId,
                  costCoin: cost
                },
                { where: { id: stockOne.id } }
              ),
              // 设置兑换码
              this.AppExchangeCodeRecordModel.create({
                userId: this.auth.id,
                type: '兌換碼',
                gainMethod: '抽獎獎賞',
                status: 20,
                businessId: stockOne.id,
                name: moheItem.name,
                img: moheItem.smallImg,
                code: stockOne.redemptionCode
              })
            ]);
          })
          .then(result => {
            this.logger.info(`${JSON.stringify(result)}`);
            return {};
          })
          .catch(err => {
            this.cthrow(511, '更新庫存失敗');
          });
      }
    }

    // 插入记录
    const record = await this.MoheItemRecordModel.create({
      id: recordId,
      moheId,
      itemId: moheItem.id,
      stockId: stockOne && stockOne.id,
      userId: this.auth.id,
      costCoin: cost,
      rewardCoin: (stockOne && 0) || moheItem.amount
    });
    this.logger.info(`moheItem = ${JSON.stringify(moheItem)}`);
    // 查询是否正确的执行到数据库
    return Object.assign(moheItem, {
      recordId: record.id
    });
  }

  async number(): Promise<ICommon.INumberOut> {
    if (!this.auth || !this.auth.id) {
      this.cthrow(511, '用户未登录');
    }
    // 查看是否还有可抽奖次数
    const mohe = await this.MoheModel.findOne({
      order: [[ConstMohe.CREATED_AT, 'desc']]
    });
    if (!mohe || !mohe.maxCount || !mohe.maxCount || !mohe.cost) {
      this.cthrow(512, '磨合配置校驗失敗,請檢查!');
    }

    const usedCount = await this.MoheItemRecordModel.count({
      where: {
        userId: this.auth.id,
        moheId: mohe.id,
        [Op.and]: [
          Sequelize.where(
            Sequelize.literal('to_days(CREATED_AT)'),
            Sequelize.literal('to_days(now())')
          )
        ]
      }
    });
    const maxCount: number = this._.toNumber(mohe.maxCount);
    if (this._.toNumber(usedCount) >= maxCount) {
      this.cthrow(511, `今日你抽晒啦，聽日再嚟抽啦`);
    }
    this.logger.info('--------');
    this.logger.info(this._.toNumber(usedCount));
    if (this._.toNumber(usedCount) === 0 && mohe.cost.split('|')[0] > 0) {
      //  fun points不足判斷
      const bonus = await this.middlePlatformService.balance({
        weUnionId: this.auth.address
      }); // balance
      if (bonus.balance < mohe.cost.split('|')[0]) {
        this.cthrow(
          511,
          '您的GuuCoin不足，無法購買，您可以參與簽到或使用傳說幣兌換獲取更多GuuCoin'
        );
      }
    }
    // 判断是否有七天签到送的次数
    const signCount = await this.MoheUserShareRecordModel.count({
      where: {
        shareId: this.auth.id,
        userId: 'signIn',
        [Op.and]: [
          Sequelize.where(
            Sequelize.literal('to_days(CREATED_AT)'),
            Sequelize.literal('to_days(now())')
          )
        ]
      }
    });
    if (signCount <= 0) {
      this.cthrow(511, '您今日還未簽到，簽到後即可獲得抽獎資格');
    }

    if (signCount > usedCount) {
      return { number: signCount };
    }
    console.log(signCount, usedCount);
    if (signCount === usedCount) {
      // 判斷是否分享且註冊新用戶
      const shareCount = await this.MoheUserShareRecordModel.count({
        where: {
          shareId: this.auth.id,
          userId: { [Op.ne]: 'signIn' },
          [Op.and]: [
            Sequelize.where(
              Sequelize.literal('to_days(CREATED_AT)'),
              Sequelize.literal('to_days(now())')
            )
          ]
        }
      });
      if (shareCount <= 0) {
        return {
          number: 99,
          shareId: this.auth.id
        };
      }
      if (shareCount > 0) {
        return { number: shareCount };
      }
    }
    if (signCount < usedCount) {
      this.cthrow(
        511,
        '您今天的抽獎資格已使用，連續7天簽到還可以再當天獲取額外的抽獎資格哦'
      );
    }

    // // 如果判斷第幾次，直接提示？還是給次數讓她自己判斷
    // if (this._.toNumber(usedCount) === 1 || this._.toNumber(usedCount) === 2) {
    //   // 判断是否有七天签到送的次数
    //   const signCount = await this.MoheUserShareRecordModel.count({
    //     where: {
    //       shareId: this.auth.id,
    //       userId: 'signIn',
    //       [Op.and]: [
    //         Sequelize.where(
    //           Sequelize.literal('to_days(CREATED_AT)'),
    //           Sequelize.literal('to_days(now())')
    //         )
    //       ]
    //     }
    //   });
    //   // 判斷是否分享且註冊新用戶
    //   const shareCount = await this.MoheUserShareRecordModel.count({
    //     where: {
    //       shareId: this.auth.id,
    //       userId: { [Op.ne]: 'signIn' },
    //       [Op.and]: [
    //         Sequelize.where(
    //           Sequelize.literal('to_days(CREATED_AT)'),
    //           Sequelize.literal('to_days(now())')
    //         )
    //       ]
    //     }
    //   });
    //   if (signCount > 0 && this._.toNumber(usedCount) === 1) {
    //     return this._.subtract(mohe.maxCount, this._.toNumber(usedCount));
    //   }
    //   if (signCount > 0 && shareCount > 0 && this._.toNumber(usedCount) === 2) {
    //     return this._.subtract(mohe.maxCount, this._.toNumber(usedCount));
    //   }
    //   if (shareCount <= 0) {
    //     return { number: 99, shareId: this.auth.id };
    //   }
    // }
    return { number: signCount };
  }

  async check(param: any): Promise<ICommon.ICheckOut> {
    const obj = await this.AppUserLogModel.findOne({
      where: { userId: this.auth.id, type: param.type || 'mohe' }
    });
    if (obj) {
      return { show: 20 };
    } else {
      await this.AppUserLogModel.create({
        userId: this.auth.id,
        type: param.type || 'mohe'
      });
      return { show: 10 };
    }
  }
}
