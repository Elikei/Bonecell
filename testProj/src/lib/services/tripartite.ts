import { inject, provide, config } from 'midway';
import { BaseService } from '../../base/base.service';
import * as Inter from '../interfaces/tripartite';
import { ConstAppUser, IAppUserModel } from '../models/app-user.model';
import { IUserCenterService } from './biz/user-center';
import crypto = require('crypto');
import { IAuth } from '../interfaces/auth';
import { IMiddlePlatformService } from './biz/middle-platform';
import * as open from 'open';
import * as _ from 'lodash';
import { IAppUserLogModel } from '../models/app-user-log.model';
import { ICmqTopicService } from './cmq-topic';
import { LedgerStock } from './ledger-stock';
import { IAppExchangeCodeRecordModel } from '../models/app-exchange-code-record.model';

// import { IAppOrderModel } from '../models/app-order.model';

export interface ITripartiteService extends TripartiteService {}

@provide()
export class TripartiteService extends BaseService {
  @inject()
  private AppUserModel: IAppUserModel;

  @inject()
  private AppUserLogModel: IAppUserLogModel;

  @inject()
  private userCenterService: IUserCenterService;

  @inject()
  private middlePlatformService: IMiddlePlatformService;

  @inject('Auth')
  private auth: IAuth;

  @config('funPoints')
  private funPoints: any;

  @inject()
  private cmqTopicService: ICmqTopicService;

  @inject()
  private ledgerStock: LedgerStock;

  @config('middlePlatform')
  private middlePlatform: any;

  @inject()
  private AppExchangeCodeRecordModel: IAppExchangeCodeRecordModel;

  @inject()
  i18n: (key: string, value?: string | string[]) => string;

  /**
   * 授权登录
   *
   * @param {Inter.IAuthorizationIn} param
   * @returns {Promise<Inter.IAuthorizationOut>}
   * @memberof TripartiteService
   */
  async authorization(
    param: Inter.IAuthorizationIn
  ): Promise<Inter.IAuthorizationOut> {
    console.log(param.redirectNo);
    param.source = '60';
    if (param.redirectNo) {
      const res: any = await this.login(param);
      if (res && res.authorization && res.phone) {
        return { code: 1, msg: 'success' };
      }
      return { code: 0, msg: 'fail' };
    }
    let pathStr = `${this.funPoints.mallWebsite}/pages/login/wait?`;
    for (const key in param) {
      if (Object.prototype.hasOwnProperty.call(param, key)) {
        pathStr += `${key}=${param[key]}&`;
      }
    }
    await open(_.trimEnd(pathStr, '&'));
    return param.uid;
  }

  /**
   * 获取用户昵称（生成）
   */
  async findNickName(): Promise<any> {
    const count = await this.AppUserModel.count();
    return `HK_1${100100000 + count}`;
  }

  /**
   * 創建
   */
  private async createUser(param: any): Promise<any> {
    // 判断用户手机号是否存在，存在则更新，不存在则创建
    const user = await this.AppUserModel.findOne({
      where: { phone: param.phone },
      attributes: [ConstAppUser.ID, ConstAppUser.NICK_NAME, ConstAppUser.PHONE]
    });
    // MD5加密密码
    param.password && (param.password = this.md5(param.password));
    const createPhone = {
      phone: param.phone,
      password: param.password,
      nickName: param.nickName,
      areaCode: param.areaCode,
      userType: param.source,
      weUnionId: param.phone,
      tripartiteId: param.uid
    };
    if (!user) {
      return this.AppUserModel.create(createPhone)
        .then(result => {
          return result;
        })
        .catch(err => {
          this.cthrow(500, err);
        });
    } else {
      await this.AppUserModel.update(createPhone, { where: { id: user.id } })
        .then(result => {
          return result;
        })
        .catch(err => {
          this.cthrow(500, err);
        });
    }
    return user;
  }

  /**
   * md5加密
   */
  md5(param: any) {
    // MD5加密密码
    const md5 = crypto.createHash('md5');
    md5.update(param);
    return md5.digest('hex');
  }

  /**
   * 增发积分接口
   *
   * @param {Inter.ICallIn} param
   * @returns {Promise<Inter.ICallOut>}
   * @memberof TripartiteService
   */
  async call(param: Inter.ICallIn): Promise<Inter.ICallOut> {
    if (param.val && Number(param.val) <= 0) {
      this.cthrow(511, 'val must be greater than 0 ');
    }
    // 登录
    const login: any = await this.login({
      uid: param.uid,
      phone: param.phone,
      source: '60',
      businessId: param.businessId
    });
    // 解密用户信息
    const res = await this.userCenterService.par({
      authorization: login.authorization
    });
    // 赠送积分
    const call = await this.middlePlatformService.callMall({
      eventId: param.eventId,
      businessNo: param.transactionId,
      paymentType: '110',
      amount: 0,
      tokenNum: Number(param.val),
      orderAmount: 0,
      weUnionId: res.address
    });
    return { ...call, eventId: param.eventId };
  }

  /**
   * 发放积分
   */
  async grantPoints(param: any): Promise<any> {
    // 登录，赠送积分
    // 查询是否存在用户
    const user = await this.AppUserModel.findOne({
      where: {
        id: param.id
      },
      attributes: [
        ConstAppUser.ID,
        ConstAppUser.NICK_NAME,
        ConstAppUser.PHONE,
        ConstAppUser.EMAIL
      ]
    });
    if (!user) {
      this.cthrow(511, await this.i18n('userNotFind'));
    }
    const userLogin: any = await this.userCenterService.phoneLogin({
      phone: user.phone
    });
    userLogin && userLogin.message && this.cthrow(511, userLogin.message);
    // userLogin
    const res = await this.userCenterService.par(userLogin);
    this.auth.authorization = res.authorization;
    // 赠送积分
    const call = await this.middlePlatformService.callMall({
      eventId: this.middlePlatform.transaction.grantPoints,
      businessNo: user.id,
      paymentType: '110',
      amount: 0,
      tokenNum: this._.floor(Number(param.val)),
      orderAmount: 0,
      weUnionId: res.address
    });
    call && call.code !== 1 && call.message && this.cthrow(511, call.message);
    // this.logger.info(JSON.stringify(call));
    await this.AppUserLogModel.create({
      userId: param.id,
      type: 'message',
      remark: this._.floor(Number(param.val))
    });
    return call;
  }

  /**
   * 核销
   */
  async writeOff(param: any): Promise<any> {
    const code = await this.AppExchangeCodeRecordModel.findOne({
      where: { id: param.id }
    });
    !code && this.cthrow(511, await this.i18n('invalidCode'));
    code.status === 10 && this.cthrow(511, await this.i18n('usedCode'));
    await this.AppUserLogModel.create({
      userId: code.userId,
      type: 'coupon'
    });
    return this.AppExchangeCodeRecordModel.update(
      { status: 10 },
      { where: { id: param.id } }
    );
  }

  /**
   * 支付回调
   *
   * @param {*} param
   * @returns {Promise<any>}
   * @memberof TripartiteService
   */
  async callback(param: any): Promise<any> {
    // TODO 支付成功回调，调用cmq触发更新订单、库存等操作
    await this.cmqTopicService.updOrder(param);
    await this.ledgerStock.payCallBackStock(param);
    return param;
  }

  async refund(param: any): Promise<any> {
    // TODO 退积分操作
    // 查询订单信息，判断是否有积分
    // const order = await this.App;
    // if (order.useDeduction === 1) {
    //   const data: any = {
    //     eventId: this.middlePlatform.transaction.order.payEventId,
    //     weUnionId: user.weUnionId,
    //     applicationId: this.middlePlatform.applicationId,
    //     businessNo: orderCancelIn.orderId
    //   };
    //   const rs = await this.middlePlatformService.tokenRefund(data);
    //   this.logger.info(`取消订单结果 = ${JSON.stringify(rs)}`);
    // }
    // 返回是否退积分成功s
  }

  async refunded(param: any): Promise<any> {
    // TODO 更新我们的订单状态
  }

  async login(param: Inter.ILoginIn): Promise<Inter.ILoginOut> {
    param.source = '60';
    // 查询是否存在用户
    let user = await this.AppUserModel.findOne({
      where: {
        tripartiteId: param.uid,
        userType: param.source
      },
      attributes: [
        ConstAppUser.ID,
        ConstAppUser.NICK_NAME,
        ConstAppUser.PHONE,
        ConstAppUser.EMAIL
      ]
    });
    // 获取用户默认昵称
    const nickName = user ? user.nickName : await this.findNickName();
    // 第三方登录
    let userLogin = await this.userCenterService.tripartite({
      tripartiteMark: param.uid,
      tripartiteType: '20',
      businessId: param.businessId
    });
    this.auth.authorization = userLogin.authorization;
    if (userLogin && !userLogin.phone) {
      // 如果没有绑定过手机号，则绑定数据库
      userLogin = await this.userCenterService.phoneBind({
        phone: param.phone
      });
      this.auth.authorization = userLogin.authorization;
      // 同步用户信息
      await this.userCenterService.accountInfo({
        nickname: nickName
      });
    }
    if (!user) {
      // 生成用户信息
      user = await this.createUser({
        ...param,
        nickName
      });
    }
    this.auth.id = user.id;
    return {
      ...userLogin,
      nickName,
      phone: param.phone,
      showGift: false,
      email: this._.get(user, 'email'),
      emailPop: await this.IsSetMail({ userId: user.id })
    };
  }

  private async IsSetMail(param: any): Promise<any> {
    const count = await this.AppUserLogModel.count({
      where: { userId: param.userId, type: 10 }
    });
    return count && count > 0 ? 2 : 1;
  }
}
