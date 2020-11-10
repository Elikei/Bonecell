import { provide, config, inject, FileStream, logger } from 'midway';
import { BaseService } from '../../base/base.service';
import { format } from 'date-fns';
import { ISnowflakeId } from '../iocs/ctx-handler';
import * as cos from 'cos-nodejs-sdk-v5';
import * as sendToWormhole from 'stream-wormhole';
import * as ICommon from '../../lib/interfaces/common';
import * as _ from 'lodash';
import * as Sharp from 'sharp';

export interface ICommonService extends CommonService {}

@provide()
export class CommonService extends BaseService {
  @config('tencentCloud')
  tencentCloud: any;

  @inject()
  private snowflakeId: ISnowflakeId;

  @logger()
  logger: any;

  /**
   *
   * @param params.imgBsae64 图片base64字符串
   * @param params.imgSuffix 图片后缀名 .png
   */
  async uploadImg(
    params: ICommon.IUploadImgIn
  ): Promise<ICommon.IUploadImgOut> {
    // 文件名
    const playId = `${format(
      new Date(),
      'YYYY-MM-DD-HHmmss'
    )}-${this.snowflakeId.create()}`;

    // 云路径
    const fullFileName = `${
      this.tencentCloud.bucketFolder
    }${playId}${params.imgSuffix || '.png'}`;
    const imgPath = `${this.tencentCloud.bucketUrl}${fullFileName}`;
    this.logger.info(fullFileName);
    // 使用永久密钥创建COS缓存实例
    const coss = new cos({
      SecretId: this.tencentCloud.secretId,
      SecretKey: this.tencentCloud.secretKey
    });

    const base64Data = params.imgBsae64.replace(/^data:image\/\w+;base64,/, '');
    const dataBuffer = Buffer.from(base64Data, 'base64');

    try {
      const result: any = await new Promise((resolver, reject) => {
        // 上传
        coss.putObject(
          {
            Bucket: this.tencentCloud.bucket /* 必须 */,
            Region: this.tencentCloud.region /* 必须 */,
            Key: fullFileName /* 必须 */,
            Body: dataBuffer,
            onProgress(progressData) {
              console.log(progressData);
            }
          },
          (err, data) => {
            if (err) {
              this.logger.info(`putObject error= ${JSON.stringify(err)}`);
              return reject({
                success: false,
                err
              });
            } else {
              this.logger.info(`putObject data= ${JSON.stringify(data)}`);
              return resolver({
                success: true,
                data
              });
            }
          }
        );
      });
      if (!result.success) {
        this.logger.info(`result = ${JSON.stringify(result)}`);
        return result.err;
      }
    } catch (err) {
      // 必须将上传的文件流消费掉，要不然浏览器响应会卡死
      await sendToWormhole(dataBuffer);
      this.cthrow(500, err);
    }
    // 图片上传成功，返回上传后的地址
    this.logger.info(`imgPath = ${JSON.stringify(imgPath)}`);
    return { url: imgPath };
  }

  /**
   * 添加商品图片
   * @param imageData
   */
  async uploadImage(imageData: FileStream): Promise<any> {
    // 商品图片
    const imgBuf = await new Promise((resolve, reject) => {
      const chunks = []; // 用于保存网络请求不断加载传输的缓冲数据
      let size = 0; // 保存缓冲数据的总长度
      imageData.on('data', function(chunk) {
        chunks.push(chunk); // 在进行网络请求时，会不断接收到数据(数据不是一次性获取到的)， // node会把接收到的数据片段逐段的保存在缓冲区（Buffer）， // 这些数据片段会形成一个个缓冲对象（即Buffer对象）， // 而Buffer数据的拼接并不能像字符串那样拼接（因为一个中文字符占三个字节）， // 如果一个数据片段携带着一个中文的两个字节，下一个数据片段携带着最后一个字节， // 直接字符串拼接会导致乱码，为避免乱码，所以将得到缓冲数据推入到chunks数组中， // 利用下面的node.js内置的Buffer.concat()方法进行拼接
        size += chunk.length; // 累加缓冲数据的长度
      });
      //
      return imageData.on('end', function(err) {
        const data = Buffer.concat(chunks, size); // Buffer.concat将chunks数组中的缓冲数据拼接起来，返回一个新的Buffer对象赋值给data
        return resolve(data);
      });
    });
    const imgSharp = Sharp(imgBuf);
    const preffix = format(new Date(), 'YYYY-MM-DD-hhmmss');
    const fileName = `${preffix}-${this.snowflakeId.create()}.jpg`;
    let imgPath = undefined;
    await imgSharp
      .toFile(`${this.tencentCloud.bucketUrl}/${fileName}`)
      .then(info => {
        imgPath = `${this.tencentCloud.bucketUrl}/${fileName}`;
        console.log(imgPath);
      });
    return imgPath;
  }

  /**
   * 抽奖计算
   *
   * @param {any[]} joinArr 抽奖参与人
   * @param {number} winnerCount 奖品总数
   * @returns
   * @memberof CommonService
   */
  async lottery(
    joinArr: any[],
    winnerCount: number
  ): Promise<{
    // 中奖
    winnerList: any[];
    // 未中奖
    loserList: any[];
  }> {
    // 参与人数少于奖品数量，所有人都中奖
    if (joinArr.length <= winnerCount) {
      return {
        winnerList: joinArr,
        loserList: []
      };
    }
    let winnerList = [];
    while (winnerList.length < winnerCount) {
      // 取得随机下标
      const temp = _.floor(Math.random() * joinArr.length);
      // 从参与人的源数组中取出中奖人，并移动到中奖数组
      winnerList = [...winnerList, ...joinArr.splice(temp, 1)];
    }
    return {
      winnerList,
      loserList: joinArr
    };
  }
}
