/*
 * @Author: 吴占超
 * @Date: 2019-05-25 09:56:11
 * @Last Modified by: 武彩平
 * @Last Modified time: 2019-11-22 15:48:53
 */
import { IDBContext } from './lib/models/dbcontext';
import { wrapper } from 'midway-joi-swagger2';
import { Application } from 'midway';
import { registerOther } from './lib/register';

module.exports = (app: Application) => {
  wrapper(app, app.config.joiSwagger);

  app.beforeStart(async () => {
    console.log('====================================');
    console.log('🚀  Your awesome APP is launching...');
    console.log('====================================');

    /**
     * 三方注册
     */
    registerOther(app.applicationContext);

    const db: IDBContext = await app.applicationContext.getAsync('DBContext');
    // const db = new DBContext(app.config.sequelize, app.config.env);
    db.init();

    console.log('====================================');
    console.log(
      `✅  http://${app.config.cluster.listen.hostname}:${app.config.cluster.listen.port}`
    );
    console.log(
      `✅  http://${app.config.cluster.listen.hostname}:${app.config.cluster.listen.port}/swagger-html`
    );
    console.log(
      `✅  http://${app.config.cluster.listen.hostname}:${app.config.cluster.listen.port}/unittest/:api`
    );
    console.log(
      `✅  http://${app.config.cluster.listen.hostname}:${app.config.cluster.listen.port}/interface/:api`
    );
    console.log('✅  Your awesome APP launched');
    console.log('====================================');

    // 全局掛載消費消息
    // agent 钩子挂载
    // if (app.config.cmqQueue.valid) {
    //   app.messenger.on('cmq-pull-action', async () => {
    //     const cmqPullAction: ICmqPullAction = await app.applicationContext.getAsync(
    //       'cmqPullAction'
    //     );
    //     console.log('========');
    //     cmqPullAction.issuingAction();
    //   });
    // }
  });

  app.ready(async () => {});

  app.beforeClose(async () => {});
};
