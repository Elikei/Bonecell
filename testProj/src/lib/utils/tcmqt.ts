import { provide, inject, config } from 'midway';
import { RequestOptions, HttpClientResponse } from 'urllib';
import { LoDashStatic } from 'lodash';
import crypto = require('crypto');

export interface ITcmqt extends Tcmqt {}

/**
 * 公共参数，必传
 */
export interface ICmqPublicSettings {
  // 具体操作的指令接口名称
  Action: string;
  // 地域参数
  Region: string;
  // 当前 UNIX 时间戳，可记录发起 API 请求的时间。
  Timestamp: number;
  // 用户可自定义随机正整数，与 Timestamp 联合起来， 用于防止重放攻击。
  Nonce: number;
  // 在 云API密钥 上申请的标识身份的 SecretId，一个 SecretId 对应唯一的 SecretKey , 而 SecretKey 会用来生成请求签名 Signature。
  SecretId: string;
  // 签名方式，目前支持 HmacSHA256 和 HmacSHA1。只有指定此参数为 HmacSHA256 时，才使用 HmacSHA256 算法验证签名
  SignatureMethod: string;
}

interface PublishMessageIn {
  topicName: string;
  msgBody: string | object;
  msgTag: string[];
  routingKey?: string;
}

@provide()
export class Tcmqt {
  @inject()
  curl: <T = any>(
    url: string,
    option: RequestOptions
  ) => Promise<HttpClientResponse<T>>;

  @config('cmqSettings')
  cmqSettings: any;

  @inject()
  _: LoDashStatic;

  // 获取主题属性
  async getTopicAttributes(topicName: string) {
    const data = this.getPublicParam('GetTopicAttributes');
    data['topicName'] = topicName;
    data['Signature'] = await this.getSignature(data);
    // 拼接路由地址
    let url = `${this.getPath()}?`;
    const keyArr = Object.keys(data);
    keyArr.forEach(item => {
      url += `${item}=${encodeURIComponent(data[item])}&`;
    });
    return this.curl(this._.trim(url, '&'), {
      dataType: 'json',
      method: 'GET'
    }).then((result: any) => {
      console.log(result);
      return result;
    });
  }

  // 发送消息
  async publishMessage(
    options: PublishMessageIn,
    endpointActionName?: string
  ): Promise<any> {
    const data = this.getPublicParam('PublishMessage');
    data['topicName'] = options.topicName;
    data['msgBody'] = options.msgBody;
    data['Signature'] = await this.getSignature(data);
    // 拼接路由地址
    let url = `${this.getPath()}?`;
    const keyArr = Object.keys(data);
    keyArr.forEach(item => {
      url += `${item}=${encodeURIComponent(data[item])}&`;
    });
    return this.curl(this._.trim(url, '&'), {
      method: 'GET',
      dataType: 'json'
    }).then((result: any) => {
      console.log(result);
      return result;
    });
  }

  /**
   * 生成签名串
   * 规则：1. 对参数排序 对所有请求参数按参数名做字典序升序排列
   * 2. 拼接请求字符串 请求参数格式化成“参数名称”=“参数值”的形式
   * 3. 拼接签名原文字符串
   * 4. 生成签名串 (HmacSHA256)
   * 5. 签名串编码
   */
  private getSignature(param: any) {
    // 1. 对参数排序
    const data = this.JsonSort(param);
    // 2. 拼接请求字符串
    const keyArr = Object.keys(data);
    let srcStr = '';
    keyArr.forEach(item => {
      srcStr += `${item}=${data[item]}&`;
    });
    // 3. 拼接签名原文字符串
    srcStr = `GET${this.subStrByPath(this.getPath())}?${this._.trim(
      srcStr,
      '&'
    )}`;
    // 4. 生成签名串 (HmacSHA256 加密)
    const secretKey = this.cmqSettings.secretKey;
    const sha256 = crypto.createHmac('sha256', secretKey);
    sha256.update(srcStr);
    // 5. 签名串编码
    return sha256.digest('base64');
  }

  /**
   * 将json数据进行排序(升序)
   * @param {*jason} data
   */
  private JsonSort(jsonData) {
    try {
      const tempJsonObj = {};
      const sdic = this._.keys(jsonData).sort();
      sdic.map((item, index) => {
        tempJsonObj[item] = jsonData[sdic[index]];
      });
      return tempJsonObj;
    } catch (e) {
      return jsonData;
    }
  }

  /**
   * 删除http地址的前置字符串
   * http://baidu.com => baidu.com
   */
  private subStrByPath(str: string) {
    if (str.indexOf('https') !== -1) {
      return str.substr(8);
    } else if (str.indexOf('http') !== -1) {
      return str.substr(7);
    } else {
      return str;
    }
  }

  /**
   *  拼接API地址
   */
  private getPath() {
    return `https://cmq-topic-${this.cmqSettings.region}.api.qcloud.com${this.cmqSettings.path}`;
  }

  /**
   * 拼接公共参数
   * @param action 具体操作的指令接口名称
   */
  private getPublicParam(action: string): ICmqPublicSettings {
    return {
      Action: action,
      Region: this.cmqSettings.Region,
      Timestamp: Math.round(new Date().getTime() / 1000),
      Nonce: this._.random(1000, 999999),
      SecretId: this.cmqSettings.secretId,
      SignatureMethod: this.cmqSettings.signatureMethod
    };
  }
}

export interface IMsgResult {
  code: number;
  message: string;
  msgId: string;
}
