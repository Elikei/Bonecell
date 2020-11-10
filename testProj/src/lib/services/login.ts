import { inject, provide, config, logger, plugin } from 'midway';
import { BaseService } from '../../base/base.service';
import * as ICommon from '../interfaces/login';
import { IAppUserModel, ConstAppUser } from '../models/app-user.model';
import {
  IPhoneVerificationModel,
  ConstPhoneVerification
} from '../models/phone-verification.model';
import { Op } from 'sequelize';
import { ISendMessageService } from './biz/send-message';
import { IUserCenterService } from './biz/user-center';
import crypto = require('crypto');
import { ILedgerIntegralModel } from '../models/ledger-integral.model';
import { IMiddlePlatformService } from './biz/middle-platform';
import {
  IActivityInstanceModel,
  ConstActivityInstance
} from '../models/activity-instance.model';
import { ISmtTaskRecordService } from './smt-task-record';
import { IAuth } from '../interfaces/auth';
import * as NodeRsa from 'node-rsa';
import { parse } from 'url';
import { IAppUserLogModel } from '../models/app-user-log.model';
import { IMoheUserShareRecordModel } from '../models/mohe-user-share-record.model';
import { Sequelize } from 'sequelize-typescript';
import { IMessageBizService } from './biz/message';
import { ConstSysUser, ISysUserModel } from '../models/sys-user.model';

export interface ILoginService extends LoginService {}

@provide()
export class LoginService extends BaseService {
  @inject()
  private AppUserModel: IAppUserModel;

  @config('phoneApi')
  phoneApi: any;

  @config('smRsakey')
  smRsakey: any;

  @inject()
  private PhoneVerificationModel: IPhoneVerificationModel;

  @inject()
  private sendMessageService: ISendMessageService;

  @inject()
  private userCenterService: IUserCenterService;

  @logger()
  logger: any;

  @inject()
  private LedgerIntegralModel: ILedgerIntegralModel;

  @inject()
  private middlePlatformService: IMiddlePlatformService;

  @inject()
  private ActivityInstanceModel: IActivityInstanceModel;

  @inject()
  private smtTaskRecordService: ISmtTaskRecordService;

  @inject()
  private MoheUserShareRecordModel: IMoheUserShareRecordModel;

  @inject()
  private messageBizService: IMessageBizService;
  /**
   * 中台
   */
  @config()
  private middlePlatform: any;

  @inject('Auth')
  private auth: IAuth;

  @inject()
  private AppUserLogModel: IAppUserLogModel;

  @config('funPoints')
  funPoints: any;

  @inject()
  private SysUserModel: ISysUserModel;

  @config('jwt')
  private jwtconfig: any;

  @plugin()
  private jwt: any;

  @inject()
  i18n: (key: string, value?: string | string[]) => string;

  /**
   * 验证码登录
   */
  async captcha(param: ICommon.ICaptchaIn): Promise<ICommon.ICaptchaOut> {
    // 判断是否存在此手机号，如果存在直接登录，不存在创建用户
    // [register 1 注册,forgetPassword 2 忘记密码,login 3 登录,bindPhone 4 绑定手机号,edit 5 编辑用户信息]
    let user = await this.AppUserModel.findOne({
      where: {
        phone: param.phone
      }
    });
    this.logger.info('user = ' + JSON.stringify(user));
    let first = false;
    if (!user) {
      first = true;
      // 创建用户
      const data = {
        phone: param.phone,
        areaCode: param.nationcode,
        userType: 50,
        weUnionId: param.phone,
        nickName: await this.findNickName()
      };
      user = await this.AppUserModel.create(data);
      this.logger.info('create user = ' + JSON.stringify(user));
      // 新用户注并且是来自墨盒分享的需要记录日志,不限次数
      param.shareId &&
        param.shareId.split('-')[1] === 'mohe' &&
        (await this.moheUserShareRecord({
          shareId: param.shareId.split('-')[0],
          userId: user.id
        }));
    }
    // 验证码校验
    await this.verification(param.phone, param.captcha, '3');
    const res: any = await this.userCenterService.phoneLogin({
      phone: param.phone,
      areaCode: param.nationcode
    });
    this.auth.id = user.id;
    this.auth.authorization = res.authorization;
    // 同步用户信息
    first &&
      (await this.userCenterService.accountInfo({
        nickname: user.nickName,
        sex: 0
      }));

    await this.smtTaskRecordService.funPointsBind();
    let showGift = false;
    param.activityId &&
      (showGift = await this.getGift({
        id: this._.get(user, 'id'),
        activityId: param.activityId,
        authorization: res.authorization
      }));
    this.logger.info('res = ' + JSON.stringify(res));
    this.logger.info(
      JSON.stringify({
        ...res,
        showGift,
        nickName: this._.get(user, 'nickName')
      })
    );
    return {
      ...res,
      showGift,
      nickName: this._.get(user, 'nickName'),
      email: this._.get(user, 'email'),
      emailPop: await this.IsSetMail({ userId: user.id })
    };
  }

  async moheUserShareRecord(param: any): Promise<any> {
    const res = await this.MoheUserShareRecordModel.findOne({
      where: {
        shareId: param.shareId,
        userId: { [Op.ne]: 'signIn' },
        [Op.and]: [
          Sequelize.where(
            Sequelize.literal('to_days(CREATED_AT)'),
            Sequelize.literal('to_days(now())')
          )
        ]
      }
    });
    if (!res) {
      // 發送系統消息
      await this.messageBizService.addMessage({
        type: 10,
        redirectUrl: '/pages/lucky/box',
        userId: param.shareId,
        content:
          '您的好友已通過您的分享參與GuuCube，獎勵您一次額外抽獎資格，僅在當日有效喔，請點擊查看參與抽獎'
      });
    }
    const data = {
      shareId: param.shareId,
      userId: param.userId,
      taskSource: '分享活動頁面,成功登記成為GuuCube會員, 開多一個魔盒'
    };
    return this.MoheUserShareRecordModel.create(data);
  }

  private async appuser(where) {
    const options = {
      attributes: [
        ConstAppUser.ID,
        ConstAppUser.PHONE,
        ConstAppUser.PASSWORD,
        ConstAppUser.NICK_NAME,
        ConstAppUser.AREA_CODE,
        ConstAppUser.EMAIL,
        ConstAppUser.PASSWORD,
        ConstAppUser.AREA_CODE,
        ConstAppUser.FB_ID
      ],
      where
    };
    return this.AppUserModel.findOne(options);
  }

  /**
   * 账号密码登录
   */
  async password(param: ICommon.IPasswordIn): Promise<ICommon.IPasswordOut> {
    const appuser = await this.appuser({
      phone: param.phone
    });
    !appuser && this.cthrow(511, '手機號不存在,請立即註冊');
    if (appuser && !appuser.password) {
      // 注册一下
      await this.userCenterService.phoneReg({
        phone: param.phone,
        areaCode: appuser.areaCode
      });
      this.cthrow(511, '您還未設置密碼，請點擊忘記密碼進行密碼重置');
    }
    // 用户名密码登录
    const loginResult = await this.userCenterService.userNameLogin({
      username: param.phone,
      password: param.password
    });
    loginResult && loginResult.message && this.cthrow(511, loginResult.message);
    let showGift = false;
    param.activityId &&
      (showGift = await this.getGift({
        id: this._.get(appuser, 'id'),
        activityId: param.activityId,
        authorization: loginResult.authorization
      }));
    return {
      ...loginResult,
      showGift,
      email: this._.get(appuser, 'email'),
      emailPop: await this.IsSetMail({ userId: appuser.id })
    };
  }

  /**
   * facebook登录
   */
  async facebook(param: ICommon.IFacebookIn): Promise<ICommon.IFacebookOut> {
    // 传入facebookid，如果存在则直接登录
    const appuser = await this.appuser({ fbId: param.id });
    if (!appuser) {
      return {
        ...param,
        phone: false,
        showGift: false
      };
    }
    const res: any = await this.userCenterService.tripartite({
      tripartiteMark: param.id,
      tripartiteType: '30'
    });
    let showGift = false;
    param.activityId &&
      (showGift = await this.getGift({
        id: this._.get(appuser, 'id'),
        activityId: param.activityId,
        authorization: res.authorization
      }));
    // 不存在则跳到下一个接口？
    return {
      ...res,
      showGift,
      nickName: this._.get(appuser, 'nickName'),
      email: this._.get(appuser, 'email'),
      emailPop: await this.IsSetMail({ userId: appuser.id })
    };
  }

  /**
   * 绑定手机号等信息
   */
  async bindInfo(param: ICommon.IBindInfoIn): Promise<ICommon.IBindInfoOut> {
    this.logger.info('绑定手机号');
    // 验证
    const fbId = await this.appuser({
      fbId: param.id
    });
    fbId && this.cthrow(511, '此facebook帳號已注冊');
    // 验证码校验
    await this.verification(param.phone, param.captcha, '4');
    // 查询当前手机号的用户信息，存在则更新，不存在创建
    let user = await this.appuser({
      phone: param.phone
    });
    const password = user && user.password;
    // 三方的登录
    let userLogin = await this.userCenterService.tripartite({
      tripartiteMark: param.id, // fbId
      tripartiteType: '30'
    });
    this.auth.authorization = userLogin.authorization;
    // 绑定手机号
    if (userLogin && !userLogin.phone) {
      userLogin = await this.userCenterService.phoneBind({
        phone: param.phone
      });
      this.auth.authorization = userLogin.authorization;
      // 修改密码
      if (param.password) {
        // 注册一下
        !password &&
          (await this.userCenterService.phoneReg({
            phone: param.phone,
            areaCode: param.nationcode,
            password: param.password
          }));
        password &&
          (await this.userCenterService.pwdEdit({
            phone: param.phone,
            password: param.password
          }));
      }
      // 同步用户信息
      await this.userCenterService.accountInfo({
        nickname: param.name,
        avatar: `${param.picture}?type=large`,
        sex: 0
      });
    }
    // 存在用户信息则直接更新绑定
    const valfb: any = {
      [ConstAppUser.NICK_NAME]: param.name,
      fbId: param.id,
      [ConstAppUser.FB_FIRST_NAME]: param.firstName,
      [ConstAppUser.FB_LAST_NAME]: param.lastName,
      [ConstAppUser.AVATAR_URL]: `${param.picture}?type=large`,
      [ConstAppUser.FB_THUMBNAIL]: param.thumbnail,
      [ConstAppUser.USER_TYPE]: 20,
      phone: param.phone,
      areaCode: param.nationcode
    };
    param.password && (valfb.password = this.md5(param.password));
    this.logger.info(JSON.stringify(valfb));
    user &&
      (await this.AppUserModel.update(valfb, {
        where: {
          id: user.id
        }
      }));
    if (!user) {
      user = await this.AppUserModel.create(valfb);
      // 新用户注并且是来自墨盒分享的需要记录日志,不限次数
      param.shareId &&
        param.shareId.split('-')[1] === 'mohe' &&
        (await this.moheUserShareRecord({
          shareId: param.shareId.split('-')[0],
          userId: user.id
        }));
    }

    if (userLogin && !userLogin.phone) {
      this.auth.id = user.id;
      // 如果不存在手机号，绑定得奖励
      await this.smtTaskRecordService.funPointsBind();
    }

    let showGift = false;
    param.activityId &&
      (showGift = await this.getGift({
        id: this._.get(user, 'id'),
        activityId: param.activityId,
        authorization: userLogin.authorization
      }));

    // 返回登录信息
    return {
      ...userLogin,
      showGift,
      nickName: valfb.nickName,
      email: this._.get(user, 'email'),
      emailPop: await this.IsSetMail({
        userId: user.id
      })
    };
  }

  /**
   * 绑定手机号等信息
   */
  async bindFacebook(
    param: ICommon.IBindFacebookIn
  ): Promise<ICommon.IBindFacebookOut> {
    this.logger.info('绑定facebook');

    const fbId = await this.appuser({
      fbId: param.id,
      id: { [Op.ne]: this.auth.id }
    });
    fbId && this.cthrow(511, '此facebook帳號已注冊');

    const user = await this.appuser({ id: this.auth.id });
    !user && this.cthrow(511, '此用戶不存在');

    // 三方的登录
    let userLogin = await this.userCenterService.tripartite({
      tripartiteMark: param.id,
      tripartiteType: '30'
    });
    this.auth.authorization = userLogin.authorization;
    // 绑定手机号
    if (userLogin && !userLogin.phone) {
      userLogin = await this.userCenterService.phoneBind({
        phone: user.phone
      });
      this.auth.authorization = userLogin.authorization;
      // 同步用户信息
      await this.userCenterService.accountInfo({
        nickname: param.name,
        avatar: `${param.picture}?type=large`,
        sex: 0
      });
    }
    // 存在用户信息则直接更新绑定
    const valfb: any = {
      [ConstAppUser.NICK_NAME]: param.name,
      fbId: param.id,
      [ConstAppUser.FB_FIRST_NAME]: param.firstName,
      [ConstAppUser.FB_LAST_NAME]: param.lastName,
      [ConstAppUser.AVATAR_URL]: `${param.picture}?type=large`,
      [ConstAppUser.FB_THUMBNAIL]: param.thumbnail,
      [ConstAppUser.USER_TYPE]: 20,
      phone: user.phone,
      areaCode: user.nationcode
    };
    this.logger.info(JSON.stringify(valfb));
    user &&
      (await this.AppUserModel.update(valfb, {
        where: {
          id: this.auth.id
        }
      }));
    return { id: this.auth.id };
  }

  /**
   * 发送验证码
   */
  async sendCaptcha(
    param: ICommon.ISendCaptchaIn
  ): Promise<ICommon.ISendCaptchaOut> {
    await this.phoneCheck(param.phone, param.nationcode);
    // 根据场景判断
    // [register 1 注册,forgetPassword 2 忘记密码,login 3 登录,bindPhone 4 绑定手机号,edit 5 编辑用户信息]
    const options: any = {
      attributes: [ConstAppUser.ID, ConstAppUser.PASSWORD],
      where: {
        phone: param.phone
      }
    };
    param.userId && (options.where.id = param.userId);
    // param.use === '1' && (options.where.password = { [Op.ne]: null });
    const regVer = await this.AppUserModel.findOne(options);
    if (param.use === '1') {
      // 您还未设置密码，请点击忘记密码进行密码重置
      regVer && this.cthrow(511, '手機號已註冊，如忘記可通過忘記密碼找回');
    }
    if (param.use === '2') {
      !regVer && this.cthrow(511, '此手機號不存在,請重新注冊');
    }
    if (param.use === '5') {
      regVer && this.cthrow(511, '電話號已註冊');
    }
    // 验证码登录
    // 发送验证码,暂时所有的验证码都是唯一的一个
    console.log(param);
    return this.sms(param);
  }
  /**
   * 用户注册
   */
  async phoneRegister(
    param: ICommon.IPhoneRegisterIn
  ): Promise<ICommon.IPhoneRegisterOut> {
    param.nickname = await this.findNickName();
    const regVer = await this.appuser({
      phone: param.phone,
      password: { [Op.ne]: null }
    });
    regVer && this.cthrow(511, '手機號已註冊，如忘記可通過忘記密碼找回');
    await this.verification(param.phone, param.verification, '1');
    return this.createPhone(param);
  }

  async updateUser(param: any): Promise<any> {
    // MD5加密密码
    const password = this.md5(param.password);
    const pwd = await this.userCenterService.pwdEdit({
      phone: param.phone,
      password: param.password
    });
    pwd && pwd.message && this.cthrow(511, pwd.message);
    const user = await this.userCenterService.userNameLogin({
      username: param.phone,
      password: param.password
    });
    const createPhone = {
      phone: param.phone,
      password,
      areaCode: param.nationcode,
      userType: 30
    };

    await this.AppUserModel.update(createPhone, {
      where: {
        phone: param.phone
      }
    });
    return {
      ...user,
      phone: param.phone
    };
  }

  async createUser(param: any): Promise<any> {
    // MD5加密密码
    const password = this.md5(param.password);
    let userId;
    const syncUser: any = {
      phone: param.phone,
      areaCode: param.nationcode,
      password: param.password
    };
    const res = await this.userCenterService.phoneReg(syncUser);
    res && res.message && this.cthrow(511, res.message);
    if (!res) {
      this.cthrow(511, '創建用戶失敗');
    }
    const user = await this.userCenterService.userNameLogin({
      username: param.phone,
      password: param.password
    });
    user && user.message && this.cthrow(511, user.message);
    this.auth.authorization = user.authorization;
    await this.userCenterService.accountInfo({
      nickname: param.nickname
    });

    const createPhone = {
      phone: param.phone,
      password,
      nickName: param.nickname,
      areaCode: param.nationcode,
      userType: 30
    };

    await this.AppUserModel.create(createPhone)
      .then(async result => {
        userId = result.id;
        // 新用户注并且是来自墨盒分享的需要记录日志,不限次数
        // this.logger.info(param.shareId.split('-')[1]);
        param.shareId &&
          param.shareId.split('-')[1] === 'mohe' &&
          (await this.moheUserShareRecord({
            shareId: param.shareId.split('-')[0],
            userId: result.id
          }));
      })
      .catch(err => {
        this.cthrow(500, err);
      });
    return {
      ...user,
      phone: param.phone,
      nickName: param.nickname,
      email: null,
      userId
    };
  }

  /**
   * 創建
   */
  private async createPhone(param: any): Promise<any> {
    // 判断用户手机号是否存在，存在则更新，不存在则创建
    const appuser = await this.appuser({
      phone: param.phone
    });
    let res;
    if (appuser) {
      this.auth.id = appuser.id;
      res = await this.updateUser(param);
    } else {
      res = await this.createUser(param);
      this.auth.id = res.userId;
    }
    await this.smtTaskRecordService.funPointsBind();

    if (param.lang) {
      await this.AppUserModel.update(
        { lang: param.lang },
        { where: { id: this.auth.id } }
      );
    }

    let showGift = false;
    param.activityId &&
      (showGift = await this.getGift({
        id: this.auth.id,
        activityId: param.activityId,
        authorization: res.authorization
      }));
    return {
      ...res,
      phone: param.phone,
      showGift,
      nickName: appuser ? appuser.nickName : param.nickname,
      email: this._.get(appuser, 'email'),
      emailPop: await this.IsSetMail({ userId: this.auth.id })
    };
  }

  /**
   * 修改密码
   */
  async phoneEdit(param: ICommon.IPhoneEditIn): Promise<ICommon.IPhoneEditOut> {
    const regVer = await this.AppUserModel.findOne({
      attributes: [ConstAppUser.ID, ConstAppUser.PASSWORD],
      where: {
        phone: param.phone
      }
    });
    if (regVer && !regVer.password) {
      // 注册一下
      await this.userCenterService.phoneReg({
        phone: param.phone,
        areaCode: param.nationcode
      });
    }
    await this.verification(param.phone, param.verification, '2');
    return this.createPhone(param);
  }

  /**
   * 发送短信
   */
  async sms(param: any): Promise<any> {
    // 一分钟内限制一条发送
    const dateC = new Date();
    dateC.setMinutes(dateC.getMinutes() - 1);
    const verIdC = await this.PhoneVerificationModel.findOne({
      attributes: [ConstPhoneVerification.ID],
      where: {
        phone: param.phone,
        createdAt: {
          [Op.gt]: dateC
        }
      }
    });
    verIdC && this.cthrow(511, '限制發送,請稍候重試');

    // 如果10分钟内创建过，逻辑删除之前的验证码，再次发送
    const date = new Date();
    date.setMinutes(date.getMinutes() - 10);
    const verId = await this.PhoneVerificationModel.findOne({
      attributes: ['id'],
      where: {
        phone: param.phone,
        createdAt: {
          [Op.gt]: date
        }
      }
    });
    verId &&
      (await this.PhoneVerificationModel.destroy({
        where: {
          id: verId.id
        }
      }));
    // 生成验证码
    const verification = `${this._.random(1000000, 9999999)}`.slice(1, 7);
    // 默认中方模版
    const data = {
      phone: param.phone,
      contextArr: [verification, '10'],
      nationcode: param.nationcode,
      templateId: this.phoneApi.domesticSMS.templateId,
      sign: this.phoneApi.domesticSMS.smsSignName,
      use: param.use
    };
    // 判断区号
    if (param.nationcode === this.phoneApi.foreignSMS.nationcodeHK) {
      data.templateId = this.phoneApi.foreignSMS.templateId;
      data.sign = this.phoneApi.foreignSMS.smsSignName;
    }
    // 发送短信
    const result = await this.sendMessageService.sendMsg(data);
    result.errmsg !== 'OK' && this.cthrow(511, result.errmsg);
    // 验证码保存到验证码表格
    await this.PhoneVerificationModel.create({
      phone: param.phone,
      verification,
      use: param.use
    });
    return { phone: param.phone };
  }

  /**
   * 短信驗證碼校驗
   * 邏輯：驗證碼在10分鐘以內創建，用途對應，邏輯刪除驗證碼，驗證通過，否則拋出異常
   * @param phone 手機號
   * @param verification 驗證碼
   * @param use 用途
   */
  async verification(phone, verification, use) {
    // 查找手机号和验证码是否匹配,并且验证码在10分钟内创建
    const date = new Date();
    date.setMinutes(date.getMinutes() - 10);
    const verId = await this.PhoneVerificationModel.findOne({
      attributes: ['id'],
      where: {
        phone,
        verification,
        use,
        createdAt: {
          [Op.gt]: date
        }
      }
    });
    !verId && this.cthrow(511, '手機號或驗證碼無效！');
    // 如果匹配逻辑删除验证码
    verId &&
      this.PhoneVerificationModel.destroy({
        where: {
          id: verId.id
        }
      });
  }

  /**
   * 获取用户昵称（生成）
   */
  async findNickName(): Promise<any> {
    const count = await this.AppUserModel.count();
    return `HK_1${100100000 + count}`;
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
   * 领取礼品
   */
  private async getGift(param: any) {
    this.logger.info('开始getGift');
    // 查询活动是否结束
    const res = await this.activity({ activityId: param.activityId });
    this.logger.info('res = ' + JSON.stringify(res));
    if (!res.show) {
      return false;
    }
    // 是否领取过礼物
    const result = await this.LedgerIntegralModel.findAll({
      where: { fromUserId: param.id, sceneStr: 4, orderId: param.activityId }
    });
    this.logger.info('result = ' + JSON.stringify(result));
    if (result && result.length > 0) {
      return false;
    }
    const token = await this.userCenterService.par({
      authorization: param.authorization
    });
    param.authorization;
    // 连接事件，领取商品
    const callRes = await this.middlePlatformService.call({
      eventId: this.middlePlatform.task.registerUserEventId,
      businessNo: param.id,
      weUnionId: token.address // address
    });
    this.logger.info('callRes = ' + JSON.stringify(callRes));
    if (!(JSON.stringify(callRes) === '{}')) {
      this.logger.info('保存到积分历史表');
      // 保存到积分历史表
      await this.LedgerIntegralModel.create({
        fromUserId: param.id,
        sceneStr: 4,
        orderId: param.activityId
      });
    }
    return true;
  }

  /**
   * 查询当前活动 TODO
   */
  private async activity(param: any): Promise<any> {
    const options = {
      where: {
        id: param.activityId,
        [ConstActivityInstance.START_TIME]: { [Op.lte]: new Date() },
        [ConstActivityInstance.END_TIME]: { [Op.gte]: new Date() }
      },
      attributes: [
        ConstActivityInstance.ID,
        ConstActivityInstance.START_TIME,
        ConstActivityInstance.END_TIME
      ]
    };
    const result = await this.ActivityInstanceModel.findOne(options);
    return result ? { show: true } : { show: false };
  }

  /**
   * 手机号合法性校验
   * @param phone
   * @param nationcode
   */
  private async phoneCheck(phone: string, nationcode: string) {
    if (nationcode === this.phoneApi.domesticSMS.nationcode) {
      // 如果區號為86，為國內電話
      !/^1[3456789]\d{9}$/.test(phone) &&
        this.cthrow(511, '手機號格式錯誤，請確認輸入');
    } else if (nationcode === this.phoneApi.foreignSMS.nationcodeHK) {
      // 如果區號為852，為香港電話
      !/^(4|5|6|7|8|9)\d{7}$/.test(phone) &&
        this.cthrow(511, '手機號格式錯誤，請確認輸入');
    } else {
      this.cthrow(511, '不支持的手機號');
    }
  }

  /**
   * SmarTone解密登陆
   *
   * @param {*} param
   * @returns {Promise<any>}
   * @memberof LoginService
   */
  async stDecrypt(param: any): Promise<any> {
    // 解密数据
    let decryptedData: any = '';
    this.logger.info('stormTone 加密字符串' + param.str);
    try {
      const privateKey = new NodeRsa(this.smRsakey.privateKey);
      privateKey.setOptions({
        encryptionScheme: 'pkcs1'
      });
      const decrypted = privateKey.decrypt(param.str, 'utf8');
      decryptedData = JSON.parse(decrypted);
    } catch (error) {
      this.logger.info(`解密 error = ${JSON.stringify(error)}`);
      this.cthrow(511, '非法請求');
    }
    this.logger.info(`解密 decryptedData = ${JSON.stringify(decryptedData)}`);
    if (!decryptedData) {
      this.cthrow(511, '非法請求');
    }

    // 三方的登录
    let userLogin = await this.userCenterService.tripartite({
      tripartiteMark: decryptedData.campaign_id,
      tripartiteType: '90'
    });
    this.auth.authorization = userLogin.authorization;

    // 绑定手机号
    if (userLogin && !userLogin.phone) {
      userLogin = await this.userCenterService.phoneBind({
        phone: decryptedData.emsisdn,
        areaCode: '852'
      });
      this.auth.authorization = userLogin.authorization;
    }
    // 查询用户是否存在
    let userRes = await this.AppUserModel.findOne({
      where: {
        phone: decryptedData.emsisdn
      },
      attributes: [ConstAppUser.ID, ConstAppUser.NICK_NAME],
      raw: true
    });
    let isNewUser = false; // 新用户标示

    // 不存在则创建
    if (!userRes) {
      const nickName = await this.findNickName();
      // 创建用户
      userRes = await this.AppUserModel.create({
        phone: decryptedData.emsisdn,
        tripartiteId: decryptedData.campaign_id,
        nickName
      });
      isNewUser = true;
    }

    // 解析redirect_url 验证新用户是否需要发送卡牌奖励
    const redirectUrlParam: any = parse(
      decodeURIComponent(decryptedData.redirect_url),
      true
    );
    if (isNewUser && redirectUrlParam.query.shareId) {
      // 发送卡牌奖励
      await this.smtTaskRecordService.shareTask({
        shareId: redirectUrlParam.query.shareId,
        userId: userRes.id
      });
    }
    if (userLogin && !userLogin.phone) {
      // 保存合并记录
      const log = await this.AppUserLogModel.create({
        userId: userRes.id,
        type: 'merge',
        remark: '登陸成功則合併會員卡',
        businessId: this.funPoints.memberId
      });
      this.logger.info(`合併會員卡記錄中-${JSON.stringify(log)}`);
    }
    return {
      redirectUrl: decryptedData.redirect_url,
      ...userLogin,
      nickName: this._.get(userRes, 'nickName'),
      isNewUser
    };
  }

  async userName(param: ICommon.IUserNameIn): Promise<ICommon.IUserNameOut> {
    const user: any = await this.SysUserModel.findOne({
      where: {
        [Op.or]: {
          userName: param.userName,
          phone: param.userName
        }
      },
      attributes: [
        ConstSysUser.ID,
        ConstSysUser.PASS_WORD,
        ConstSysUser.USER_NAME,
        ConstSysUser.SHOP_ID
      ]
    });
    if (!user) {
      this.cthrow(511, await this.i18n('accountNotFind'));
    }
    console.log(JSON.stringify(user));
    const pass = await this.md5(param.passWord);
    console.log(pass);
    if (user.passWord !== pass) {
      this.cthrow(511, await this.i18n('passwordErr'));
    }
    const authde: IAuth = {
      id: user.id,
      userName: user.userName,
      provider: 'sys',
      code: user.id,
      onTime: new Date()
    };
    const token = this.jwt.sign(authde, this.jwtconfig.secret, {
      expiresIn: this.jwtconfig.expiresIn
    });

    return {
      id: user.id,
      nickName: user.userName,
      token
    };
  }

  private async IsSetMail(param: any): Promise<any> {
    const count = await this.AppUserLogModel.count({
      where: { userId: param.userId, type: 10 }
    });
    return count && count > 0 ? 2 : 1;
  }
}
