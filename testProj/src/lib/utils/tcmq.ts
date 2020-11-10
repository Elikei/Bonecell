/*
 * @Author: 吴占超
 * @Date: 2019-05-27 23:34:48
 * @Last Modified by: 武彩平
 * @Last Modified time: 2019-11-22 15:49:43
 */
import { CMQ } from 'cmq-sdk';
import { config, provide } from 'midway';

export interface ITcmq extends Tcmq {}

// #region interface
interface ICmqSettings {
  region: string;
  secretId: string;
  secretKey: string;
  extranet: boolean;
  signatureMethod: string;
  path: string;
}

interface PublishMessageIn {
  topicName: string;
  msgBody: string | object;
  msgTag: string[];
  routingKey?: string;
}

interface SendMessageIn {
  queueName: string;
  msgBody: string | object;
  delaySeconds?: number;
}

export interface IReceiveMessageIn {
  queueName: string;
  pollingWaitSeconds?: number;
}

export interface IDeleteMessageIn {
  queueName: string;
  receiptHandle: string;
}

// 返回值 {code 错误码 msg 错误信息 msgId 成功}
export interface IMsgResult {
  code: number;
  message: string;
  msgId: string;
}

export interface IReceiveMsgResult {
  code: number;
  message: string;
  requestId: string;
  msgId: string;
  msgBody: string;
  receiptHandle: string; // 每次消费返回唯一的消息句柄。用于删除该消息
  enqueueTime: number;
  nextVisibleTime: number;
  dequeueCount: number;
  firstDequeueTime: number;
}

export interface ISendMsgResult {
  code: number;
  message: string;
  requestId: string;
  msgId: string;
}

export interface IDelMsgResult {
  code: number;
  message: string;
  requestId: string;
}

// #endregion
@provide()
export class Tcmq {
  mq: CMQ.Client;

  @config('cmqTopic')
  cmqTopic: any;

  constructor(@config('cmqSettings') config: ICmqSettings) {
    this.mq = CMQ.NEW(config);
  }

  async publishMessage(
    options: PublishMessageIn,
    endpointActionName: string
  ): Promise<IMsgResult> {
    // 判断主题是否存在
    const res = await this.mq.getTopicAttributes({
      topicName: options.topicName
    });
    if (res.code !== 0) {
      // 创建主题
      return this.mq
        .createTopic({
          topicName: options.topicName
        })
        .then(result => {
          // 创建订阅 建议预先创建主题以及定于，此处代码 仅作为最后的容灾
          return this.mq.subscribe({
            topicName: options.topicName,
            subscriptionName: `subscriptionName`,
            protocol: 'http',
            endpoint: `${this.cmqTopic.endpoint}/cmq-topic/${endpointActionName}`
          });
        })
        .then(result => {
          return this.mq.publishMessage(options);
        })
        .then(result => {
          return result.code === 0
            ? result.msgId.toString()
            : result.code.toString();
        })
        .catch(error => {
          return error;
        });
    }
    return this.mq.publishMessage(options);
  }

  async sendMessage(options: SendMessageIn): Promise<ISendMsgResult> {
    // 判断隊列是否存在
    const res = await this.mq.getQueueAttributes({
      queueName: options.queueName
    });
    if (res.code !== 0) {
      // 创建隊列
      return this.mq
        .createQueue({
          queueName: options.queueName
        })
        .then(result => {
          // 發送消息
          return this.mq.sendMessage(options);
        })
        .then(result => {
          return result.code === 0
            ? result.msgId.toString()
            : result.code.toString();
        })
        .catch(error => {
          return error;
        });
    }
    return this.mq.sendMessage(options);
  }

  /**
   * 接收消息
   */
  async receiveMessage(options: IReceiveMessageIn): Promise<IReceiveMsgResult> {
    // 判断隊列是否存在
    const res = await this.mq.getQueueAttributes({
      queueName: options.queueName
    });
    if (res.code !== 0) {
      // 创建隊列
      return this.mq
        .createQueue({
          queueName: options.queueName
        })
        .then(result => {
          // 接收消息
          return this.mq.receiveMessage(options);
        })
        .then(result => {
          return result.code === 0
            ? result.msgId.toString()
            : result.code.toString();
        })
        .catch(error => {
          return error;
        });
    }
    return this.mq.receiveMessage(options);
  }

  /**
   * 删除消息
   */
  async deleteMessage(options: IDeleteMessageIn): Promise<IDelMsgResult> {
    // 判断隊列是否存在
    const res = await this.mq.getQueueAttributes({
      queueName: options.queueName
    });
    if (res.code !== 0) {
      // 创建隊列
      return this.mq
        .createQueue({
          queueName: options.queueName
        })
        .then(result => {
          // 删除消息
          return this.mq.deleteMessage(options);
        })
        .then(result => {
          return result.code === 0
            ? result.msgId.toString()
            : result.code.toString();
        })
        .catch(error => {
          return error;
        });
    }
    return this.mq.deleteMessage(options);
  }
}
