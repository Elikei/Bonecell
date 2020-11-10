import { provide, Context, inject } from 'midway';
import { BaseController } from '../../base/base.controller';
import {
  SwaggerJoiController as sjc,
  SwaggerJoiPost as sjp
} from 'midway-joi-swagger2';
import * as Schemas from '../../lib/schemas/tripartite';
import { ITripartiteService } from '../../lib/services/tripartite';

@provide()
@sjc({
  api: 'tripartite',
  path: '/v1',
  description: '三方对接'
})
export class TripartiteController extends BaseController {
  @inject()
  private tripartiteService: ITripartiteService;

  @sjp({
    api: 'tripartite',
    path: '/{businessId}/authorization',
    summary: 'authorization',
    description: '授权登录',
    routerOptions: { middleware: ['tripartite'] },
    body: Schemas.SAuthorizationIn,
    pathParams: Schemas.STripartitePath,
    responses: Schemas.SAuthorizationOut,
    auth: 'apikey'
  })
  async authorization(ctx: Context) {
    ctx.body = await this.tripartiteService.authorization({
      ...ctx.request.body,
      businessId: ctx.params.businessId
    });
  }

  @sjp({
    api: 'tripartite',
    path: '/{businessId}/call',
    summary: 'call',
    description: '增发积分接口',
    routerOptions: { middleware: ['tripartite'] },
    pathParams: Schemas.STripartitePath,
    body: Schemas.SCallIn,
    responses: Schemas.SCallOut,
    auth: 'apikey'
  })
  async call(ctx: Context) {
    ctx.body = await this.tripartiteService.call({
      ...ctx.request.body,
      businessId: ctx.params.businessId
    });
  }

  @sjp({
    api: 'tripartite',
    path: '/{businessId}/callback',
    summary: 'call',
    description: '支付成功回调',
    routerOptions: { middleware: ['tripartite'] },
    pathParams: Schemas.STripartitePath,
    body: Schemas.SCallBackIn,
    responses: Schemas.SCallBackOut,
    auth: 'apikey'
  })
  async callback(ctx: Context) {
    ctx.body = await this.tripartiteService.callback(ctx.request.body);
  }
}
