/*
 * @Author: xieminghao
 * @Date: 2019-08-07 10:28:38
 * @Last Modified by: 武彩平
 * @Last Modified time: 2020-10-14 14:02:26
 */
import { inject, provide } from 'midway';
import { BaseService } from '../../base/base.service';
import { IAppLedgerStockLogModel } from '../models/app-ledger-stock-log.model';
import { ISnowflakeId } from '../iocs/ctx-handler';
import * as _ from 'lodash';
import { IDBContext } from '../models/dbcontext';
import {
  IPayCallBackUpdStockIn,
  EStockOperationType
} from '../../lib/interfaces/ledger-stock';
import { Sequelize, Op } from 'sequelize';
import { IAppOrderModel } from '../models/app-order.model';
import { IAppOrderItemModel } from '../models/app-order-item.model';
import {
  IAppLedgerStockModel,
  ConstAppLedgerStock
} from '../models/app-ledger-stock.model';
import { ConstAppProduct, IAppProductModel } from '../models/app-product.model';

export interface ILedgerStock extends LedgerStock {}
@provide()
export class LedgerStock extends BaseService {
  @inject()
  private AppOrderModel: IAppOrderModel;

  @inject()
  private AppOrderItemModel: IAppOrderItemModel;

  @inject()
  private snowflakeId: ISnowflakeId;

  @inject()
  private DBContext: IDBContext;

  @inject()
  private AppLedgerStockModel: IAppLedgerStockModel;

  @inject()
  private AppLedgerStockLogModel: IAppLedgerStockLogModel;

  @inject()
  private AppProductModel: IAppProductModel;

  @inject()
  logger: any;

  /**
   * 更新库存信息
   *
   * @param paymentIn
   */
  async payCallBackStock(paramIn: IPayCallBackUpdStockIn) {
    // 必要参数验证
    if (!paramIn.referenceId) {
      return this.cthrow(511, '必要参数不可以为空!');
    }

    // 拉取订单信息
    const orderObj = await this.AppOrderModel.findOne({
      where: {
        id: paramIn.referenceId
        // status: EOrderStatus.Paymented
      },
      include: [
        {
          model: this.AppOrderItemModel,
          as: 'orderItem',
          required: true,
          include: [
            {
              model: this.AppProductModel,
              as: 'product',
              required: true,
              attributes: [
                ConstAppProduct.ID,
                ConstAppProduct.AVAILABLE_STOCK
                // ConstAppProduct.IMG,
                // ConstAppProduct.CODE
              ]
            }
          ]
        }
      ]
    });
    this.logger.info('orderObj' + JSON.stringify(orderObj));
    if (!orderObj) {
      return this.cthrow(511, '不存在此订单相关信息！');
    }
    // paramIn.referenceId
    // 支付成功设置库存，判断是否重复抵扣库存校验
    const stock = await this.AppLedgerStockModel.findOne({
      where: { orderId: paramIn.referenceId }
    });
    stock && this.cthrow(511, '已消減庫存');
    // 获取分配批次
    let allBatches = await this.AppLedgerStockModel.findAll({
      attributes: [
        [Sequelize.fn('min', Sequelize.col('id')), 'id'],
        [Sequelize.fn('min', Sequelize.col('created_at')), 'created_at'],
        ConstAppLedgerStock.BATCH,
        [
          Sequelize.fn('sum', Sequelize.col(ConstAppLedgerStock.TOTAL)),
          'total'
        ],
        [
          Sequelize.fn('sum', Sequelize.col(ConstAppLedgerStock.QUANTITY)),
          'quantity'
        ]
      ],
      group: ['product_Id', ConstAppLedgerStock.BATCH],
      where: {
        productId: {
          [Op.in]: _(orderObj.orderItem)
            .map(item => {
              return item.productId;
            })
            .value()
        }
        // batch: {
        //   [Op.ne]: null // '~tempBatch'
        // }
      }
    });

    if (!allBatches || allBatches.length === 0) {
      allBatches = [{ quantity: 0 }];
    }

    // 库存操作
    const res = await this.DBContext.sequelize
      .transaction(t => {
        const arrList = [];
        _.map(_.get(orderObj, 'orderItem', []), itemObj => {
          const obj = {
            code: _.get(itemObj.product, 'code', null),
            operationType: EStockOperationType.order,
            orderId: itemObj.orderId,
            orderItemId: itemObj.id,
            productId: itemObj.productId,
            shopId: itemObj.shopId,
            userId: orderObj.userId
          };

          // 计算可分配批次
          while (itemObj.quantity > 0) {
            const temp = _.filter(allBatches, bat => {
              return bat.quantity > 0;
            });
            console.log(
              'all-> ' +
                JSON.stringify(allBatches) +
                '   temp=>' +
                JSON.stringify(temp)
            );
            if (!temp || temp.length === 0) {
              const stockId = this.snowflakeId.create();
              arrList.push(
                this.AppLedgerStockModel.create(
                  _.assign(
                    {
                      id: stockId,
                      batch: null, // '~tempBatch',
                      quantity: _.subtract(0, itemObj.quantity),
                      total: _.subtract(
                        Number(allBatches[0].quantity),
                        itemObj.quantity
                      )
                    },
                    obj
                  ),
                  {
                    transaction: t
                  }
                )
              );
              arrList.push(
                this.AppLedgerStockLogModel.create(
                  _.assign(
                    {
                      sourceId: null,
                      targetId: stockId,
                      batch: null, // '~tempBatch',
                      quantity: _.subtract(0, itemObj.quantity),
                      total: _.subtract(
                        Number(allBatches[0].quantity),
                        itemObj.quantity
                      )
                    },
                    obj
                  ),
                  {
                    transaction: t
                  }
                )
              );
              arrList.push(
                this.AppProductModel.update(
                  { availableStock: itemObj.product.availableStock - 1 },
                  {
                    where: { id: itemObj.productId },
                    transaction: t
                  }
                )
              );
              itemObj.quantity = 0;
              break;
            }

            _.sortBy(allBatches, ['created_at', 'batch'])
              .filter(bat => {
                return bat.quantity > 0;
              })
              .map(bat => {
                if (itemObj.quantity > 0) {
                  let qua = _.parseInt(bat.quantity);
                  let _changeCount = 0;
                  const stockId = this.snowflakeId.create();
                  console.log(
                    'qua=>' + qua + '    quantity=>' + itemObj.quantity
                  );

                  if (qua >= itemObj.quantity) {
                    _changeCount = _.subtract(0, itemObj.quantity);
                    qua = _.subtract(qua, itemObj.quantity);
                    itemObj.quantity = 0;
                  } else {
                    _changeCount = _.subtract(0, qua);
                    itemObj.quantity = _.subtract(itemObj.quantity, qua);
                    qua = 0;
                  }
                  console.log(
                    '2 qua=>' + qua + '    quantity=>' + itemObj.quantity
                  );
                  bat.quantity = qua;

                  arrList.push(
                    this.AppLedgerStockModel.create(
                      _.assign(
                        {
                          id: stockId,
                          batch: bat.batch,
                          quantity: _changeCount,
                          total: bat.quantity
                        },
                        obj
                      ),
                      {
                        transaction: t
                      }
                    )
                  );
                  arrList.push(
                    this.AppLedgerStockLogModel.create(
                      _.assign(
                        {
                          sourceId: bat.id,
                          targetId: stockId,
                          batch: bat.batch,
                          quantity: _changeCount,
                          total: bat.quantity
                        },
                        obj
                      ),
                      {
                        transaction: t
                      }
                    )
                  );
                }
              });
            arrList.push(
              this.AppProductModel.update(
                { availableStock: itemObj.product.availableStock - 1 },
                {
                  where: { id: itemObj.productId },
                  transaction: t
                }
              )
            );
          }
        });

        return Promise.all(arrList);
      })
      .then(result => {
        return { id: paramIn.referenceId };
      })
      .catch(err => {
        this.cthrow(500, err);
      });

    return res;
  }
}
