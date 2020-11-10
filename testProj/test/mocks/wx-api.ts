/*
 * @Author: 武彩平
 * @Date: 2019-07-24 18:35:52
 * @Last Modified by: 武彩平
 * @Last Modified time: 2019-07-25 11:16:04
 */

import { MidwayMockApplication } from 'midway-mock';
export const mocks = async (app: MidwayMockApplication) => {
  console.log(app.getConfig('userConfig'));
  if (!app.getConfig('mock').enable) {
    return;
  }

  app.mockHttpclient('http://www.linlin.site:8061', {
    data: {
      serverToken: '12399'
    }
  });

  app.mockHttpclient(
    /http:\/\/www.linlin.site:8061\/mini-app\/code2session[^]/,
    {
      data: {
        openid: 'oqh_I5d6W_EJ3pE27WcPi7YfSYVk',
        unionid: 'oiIRY6MPuL7J1UEhY7X-A-V2p6Tk'
      }
    }
  );
};
