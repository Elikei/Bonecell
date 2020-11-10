import { provide, inject, config } from 'midway';
import { BaseService } from '../../base/base.service';
import {
  ICmqMsg,
  INotAmountUpdOrderIn,
  INotAmountUpdOrderOut
} from '../interfaces/cmq-topic';
import { IMiddlePlatformService } from './biz/middle-platform';
import { LedgerStock } from './ledger-stock';
import { ITaskService } from './biz/task';
import { INodeMailer } from './biz/send-email';
import { IAppUserModel, ConstAppUser } from '../models/app-user.model';
import { format } from 'date-fns';
import { IAppExchangeCodeRecordModel } from '../models/app-exchange-code-record.model';
import {
  IAppProductExchangeCodeModel,
  ConstAppProductExchangeCode
} from '../models/app-product-exchange-code.model';
import {
  IAppOrderItemModel,
  ConstAppOrderItem
} from '../models/app-order-item.model';
import {
  IAppOrderModel,
  ConstAppOrder,
  EOrderType,
  EPaymentStatus,
  EStatus,
  EDeliveryMethod
} from '../models/app-order.model';
export interface ICmqTopicService extends CmqTopicService {}

@provide()
export class CmqTopicService extends BaseService {
  @inject()
  private AppOrderModel: IAppOrderModel;

  @inject()
  private AppOrderItemModel: IAppOrderItemModel;

  @inject()
  private AppProductExchangeCodeModel: IAppProductExchangeCodeModel;

  @inject()
  private AppUserModel: IAppUserModel;

  @inject()
  private AppExchangeCodeRecordModel: IAppExchangeCodeRecordModel;

  @inject()
  logger: any;

  @config('phoneApi')
  phoneApi: any;

  @inject()
  private middlePlatformService: IMiddlePlatformService;

  @inject()
  private taskService: ITaskService;

  @config()
  middlePlatform: any;

  @config('userCenter')
  userCenter: any;

  @inject()
  private ledgerStock: LedgerStock;

  @inject()
  private nodeMailer: INodeMailer;

  @config('funPoints')
  funPoints: any;

  // TODO: 支付回调
  /**
   * 更新订单状态｜积分返还
   */
  async updOrder(cmqMsg: ICmqMsg): Promise<any> {
    const param = Object.assign(cmqMsg.msgBody, {
      amount: cmqMsg.msgBody.appid
        ? Number(cmqMsg.msgBody.amount)
        : this.calculation.mul(cmqMsg.msgBody.amount)
    });
    // const param = {
    //   referenceId: '1256779614114545664',
    //   refundId: '',
    //   amount: 744
    // };
    this.logger.info(`cmqMsg = ${JSON.stringify(param)}`);
    // 查询订单信息
    const result: any = await this.AppOrderModel.findOne({
      where: {
        id: param.referenceId
      },
      attributes: [
        ConstAppOrder.ID,
        ConstAppOrder.USER_ID,
        ConstAppOrder.USER_ADDRESS,
        ConstAppOrder.PAYMENT_METHOD,
        ConstAppOrder.RETURN_INTEGRAL,
        ConstAppOrder.ORDER_TYPE,
        ConstAppOrder.TOTAL_AMOUNT,
        ConstAppOrder.PAYMENT_AMOUNT,
        ConstAppOrder.EXCHANGE_CODE,
        ConstAppOrder.INTEGRAL,
        ConstAppOrder.DELIVERY_METHOD,
        ConstAppOrder.RECEIVE_ADDRESS,
        ConstAppOrder.PAYMENT_STATUS,
        ConstAppOrder.STATUS
      ],
      include: [
        {
          model: this.AppOrderItemModel,
          required: true,
          attributes: [
            ConstAppOrderItem.PRODUCT_ID,
            ConstAppOrderItem.PRODUCT_DETAIL
          ]
        }
      ],
      raw: true
    });
    // 判断是否符合条件
    !result && this.cthrow(511, '不存在此訂單相關信息');
    this.logger.info(`result = ${JSON.stringify(result)}`);
    const amount = this._.floor(param.amount);
    const paymentAmount = this._.floor(result.paymentAmount * 100);
    console.log(paymentAmount);
    !(paymentAmount === amount || paymentAmount === amount + 1) &&
      this.cthrow(511, '支付金額不符合');
    this._.includes([EPaymentStatus.Paymented], result.paymentStatus) &&
      this._.includes([EStatus.Delivered], result.status) &&
      this.cthrow(511, '订单已支付完成');
    // 判断end
    const model: any = {
      paymentStatus: EPaymentStatus.Paymented,
      transactionId: param.refundId,
      payMsg: JSON.stringify(param)
    };
    // 虛擬商品設置兌換碼
    if (result.orderType.toString() === EOrderType.Virtual) {
      const exchangeCode: any = await this.setExchangeCode(
        result['orderItem.productId']
      );
      // 設置
      model.status = EStatus.Delivered;
      model.exchangeCode = JSON.stringify([exchangeCode]);
      const productDetail = this._fromatProduct(
        result['orderItem.productDetail']
      );
      // 设置兑换码
      const record = await this.AppExchangeCodeRecordModel.create({
        userId: result.userId,
        type: '兌換碼',
        gainMethod: '積分換購',
        status: 20,
        businessId: result['orderItem.productId'],
        name: productDetail.name,
        img: productDetail.img,
        exchangeCode: model.exchangeCode,
        serialNo: exchangeCode.cardKey,
        code: exchangeCode.cardNumber
      });
      this.logger.info(`record = ${JSON.stringify(record)}`);
    } else {
      model.status = EStatus.Delivered;
    }
    // 更新訂單狀態
    const res = await this.AppOrderModel.update(model, {
      where: {
        id: param.referenceId
      }
    });
    this.logger.info(`更新订单状态结果 res = ${JSON.stringify(res)}`);
    // 金额大于0才能赠送积分
    if (res && result.paymentAmount > 0) {
      const data = {
        eventId: this.middlePlatform.transaction.orderGet,
        businessNo: result.id,
        paymentType: result.paymentMethod
          ? result.paymentMethod.toString()
          : '90',
        amount: result.paymentAmount,
        tokenNum: result.returnIntegral,
        orderAmount: result.paymentAmount,
        weUnionId: result.userAddress
      };
      const dedu = await this.middlePlatformService.callMall(data);
      this.logger.info(`赠送结果 dedu = ${JSON.stringify(dedu)}`);
    }
    this.logger.info(
      JSON.stringify({
        userId: result.userId,
        address: result.userAddress,
        mark: 'orderWeek',
        productId: result.id
      })
    );
    // 推送到cmq
    await this.taskService.pushTaskToCmq({
      userId: result.userId,
      address: result.userAddress,
      mark: 'orderWeek',
      orderId: result.id
    });
    // 同步订单
    // await this.orderBizService.pushOrderToMiddle(param);
    // 發送郵件
    await this.sendMail(result, model);
    // TODO 通知BluePay，可以生成取货码了
    return {
      id: param.referenceId
    };
  }

  /**
   * 支付成功后设置兑换码更新兑换码表的状态及发送短信
   */
  async setExchangeCode(type: string): Promise<string> {
    const codeRes = await this.AppProductExchangeCodeModel.findOne({
      attributes: [
        ConstAppProductExchangeCode.ID,
        ConstAppProductExchangeCode.CARD_KEY,
        ConstAppProductExchangeCode.CARD_NUMBER,
        ConstAppProductExchangeCode.NAME,
        ConstAppProductExchangeCode.PRODUCT_ID,
        ConstAppProductExchangeCode.BUSINESS_ID
      ],
      where: { status: 1, productId: type }
    });
    !codeRes && this.cthrow(511, '補貨中');
    // 更新兑换码信息
    await this.AppProductExchangeCodeModel.update(
      { status: 2 },
      { where: { id: codeRes.id, status: 1 } }
    );
    return codeRes;
  }

  /**
   * 支付回调cmq 更新库存信息
   * @param cmqMsg
   */
  async payCallBackStock(cmqMsg: ICmqMsg): Promise<any> {
    this.ledgerStock.payCallBackStock(cmqMsg.msgBody);
    console.log(`cmqMsg:${JSON.stringify(cmqMsg)}`);
  }

  /**
   * 金額為0的時候，訂單回調
   */
  async notAmountUpdOrder(
    param: INotAmountUpdOrderIn
  ): Promise<INotAmountUpdOrderOut> {
    const msgBody: any = {
      msgBody: { referenceId: param.referenceId, amount: 0 }
    };
    await this.updOrder(msgBody);
    this.ledgerStock.payCallBackStock(param);
    return param;
  }

  /**
   * 支付成功發送郵件
   */
  async sendMail(param: any, codeParam: any): Promise<any> {
    this.logger.info(`开始发送邮件～`);
    !codeParam && this.cthrow(511, '兌換碼不存在兌換碼');
    // 查询用户信息
    const user = await this.AppUserModel.findOne({
      where: { id: param.userId },
      attributes: [
        ConstAppUser.EMAIL,
        ConstAppUser.NICK_NAME,
        ConstAppUser.PHONE
      ]
    });
    this.logger.info(`user = ${JSON.stringify(user)}`);
    let data;
    if (param.orderType.toString() === EOrderType.Entity) {
      const freight =
        param.deliveryMethod === EDeliveryMethod.SunFeng
          ? this.funPoints.freight
          : 0;
      data = {
        to: user.email,
        subject: `您的GuuCube積分商城訂單——${format(
          new Date(),
          'YYYY-MM-DD HH:mm:ss'
        )}`,
        html: `<p>
    感謝閣下於精品購物！
</p>
<p>
    * 如購買現貨貨品，因處理需時，請收到WhatsApp通知後再到分店取貨。
</p>
<p>
    * 如選擇順豐運送，請等待約1-2星期到貨。
</p>
<p>
    <br/>
</p>
<p>
    親愛的${user.nickName}，以下是你的購買詳情：
</p>
<p>
    <br/>
</p>
<p>
    GuuCoin  : ${param.integral || 0}
</p>
<p>
    Subtotal : $${Number(param.paymentAmount).toFixed(2)}
</p>
<p>
    Shipping : $${freight.toFixed(2)}
    </p>
<p>
    Total    : $${(Number(param.paymentAmount) + freight).toFixed(2)}
</p>
<p>
    <br/>
</p>
<p>
    Thanks
</p>
<p>
    Advokate Inc.
</p>`
      };
      this.sendMailToClerk(param, user);
    }
    if (param.orderType.toString() === EOrderType.Virtual) {
      const exchangeCode = JSON.parse(codeParam.exchangeCode)[0];
      const serialNoText = exchangeCode.cardNumber
        ? `
    <p>
    卡 號：${exchangeCode.cardNumber}
    </p>`
        : '';
      const codeText = exchangeCode.cardKey
        ? `<p>
    兌換碼：${exchangeCode.cardKey}
    </p>`
        : '';
      const productDetail = this._fromatProduct(
        param['orderItem.productDetail']
      );
      data = {
        to: user.email,
        subject: `您的GuuCube積分商城訂單——${format(
          new Date(),
          'YYYY-MM-DD HH:mm:ss'
        )}`,
        html: `<p>
    您好， 以下是你在GuuCube換購了的 ${productDetail.name} 卡號和兌換碼，請根據以下流程進行儲值.
</p>
<p>
    <br/>
</p>
${serialNoText}
${codeText}
<p>
    <br/>
</p>
<p>
    ${productDetail.detail}
</p>
<p>
    <br/>
</p>
<p>
    Thanks
</p>
<p>
    Advokate Inc.
</p>
<p>
    <br/>
</p>`
      };
    }
    return this.nodeMailer.sendMail(data);
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
      brandName: item.brand.lang
        .filter(p => p.lang === this.lang.lang)
        .find(i => i.type === 'name').content,
      code: item.code,
      saleAmount: item.price.saleAmount,
      marketAmount: item.price.marketAmount,
      img: item.img,
      integral: item.integral,
      returnIntegral: item.returnIntegral,
      name: item.productLang
        .filter(p => p.lang === this.lang.lang)
        .find(i => i.type === 'name').content,
      detail: item.productLang
        .filter(p => p.lang === this.lang.lang)
        .find(i => i.type === 'detail').content,
      purchaseLimit: item.purchaseLimit,
      shopId: item.shopId,
      availableStock: item.availableStock,
      type: item.type
    };
  }

  /**
   * 店员发送邮件
   */
  async sendMailToClerk(param: any, user: any) {
    const address = param.receiveAddress;
    const productDetail = this._fromatProduct(param['orderItem.productDetail']);
    console.log(address);
    const text =
      param.deliveryMethod === EDeliveryMethod.SunFeng
        ? `<p>
    收貨地址為： ${address.areaFull}
</p>
<p>
    收貨人： ${address.consignee}
</p>
<p>
    收貨電話： ${address.phone}
</p>`
        : `<p>
    自提點為：${address.deliveryPlace}
</p>`;
    const data = {
      to: this.funPoints.clerkStr,
      subject: `您有來自GuuCube積分商城的訂單等待配送`,
      html: `<p>
    用戶${user.nickName}已成功購買${productDetail.name}1件；
</p>
<p>
    <br/>
</p>
<p>
    聯繫方式：${user.phone}（手機）、${user.email}（電郵）
</p>
<p>
    <br/>
</p>
<p>
    用戶選擇${
      param.deliveryMethod === EDeliveryMethod.SunFeng
        ? '順豐速運（到付）'
        : '定點自提'
    }：
</p>
<p>
    <br/>
</p>
${text}
<p>
    <br/>
</p>
<p>
    Thanks
</p>
<p>
    Advokate Inc.
</p>`
    };
    return this.nodeMailer.sendMail(data);
  }
}
