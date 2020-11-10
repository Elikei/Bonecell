import { Application, Context } from 'midway';
import { IOrderBizService } from '../../lib/services/biz/order-biz';

export = (app: Application) => {
  return {
    schedule: app.getConfig('schedule').orderAutoCancel,
    async task(ctx: Context) {
      ctx.logger.info(process.pid, 'order-auto-cancel');
      const orderBizService: IOrderBizService = await app
        .getApplicationContext()
        .getAsync('orderBizService');
      // 支付中超过两天自动取消
      await orderBizService.checkOrder(ctx);
    }
  };
};
