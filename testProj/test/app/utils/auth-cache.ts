import * as _ from 'lodash';
import { MidwayMockApplication } from 'midway-mock/src';
/*
 * @Author: 吴占超
 * @Date: 2019-07-23 17:57:17
 * @Last Modified by: 武彩平
 * @Last Modified time: 2019-11-22 17:14:17
 */
export const findToken = async (app: MidwayMockApplication) => {
  return app['cache'].get(
    'token',
    async () => {
      const result = await app
        .httpRequest()
        .post('/user/code2Session')
        .send({
          code: '222'
        });
      console.log(result.body);
      return result.body.authorization;
    },
    7100
  );
};
