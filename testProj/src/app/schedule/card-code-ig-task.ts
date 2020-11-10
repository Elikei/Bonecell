import { Application, Context } from 'midway';
import { ICardCodeTaskService } from '../../lib/services/biz/card-code-task';

export = (app: Application) => {
  return {
    schedule: app.getConfig('schedule').cardCodeIgTask,
    async task(ctx: Context) {
      const curl = await ctx.requestContext.getAsync('curl');
      ctx.state.curl = curl;
      ctx.logger.info(process.pid, 'cardCodeTask');
      const orderBizService: ICardCodeTaskService = await app
        .getApplicationContext()
        .getAsync('cardCodeTaskService');
      await orderBizService.checkTask('instagram', 30); // 任务标示 code码 type 值
    }
  };
};
