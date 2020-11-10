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
  api: 'business',
  path: '/api/business',
  description: '三方对接'
})
export class BusinessController extends BaseController {
  @inject()
  private tripartiteService: ITripartiteService;

  @sjp({
    api: 'business',
    path: '/grant-points',
    summary: 'grantPoints',
    description: '发放积分',
    body: Schemas.SGrantPointsIn,
    responses: Schemas.SGrantPointsOut,
    auth: 'apikey'
  })
  async grantPoints(ctx: Context) {
    ctx.body = await this.tripartiteService.grantPoints(ctx.request.body);
  }

  @sjp({
    api: 'business',
    path: '/write-off',
    summary: 'writeOff',
    description: '核销',
    body: Schemas.SWriteOffIn,
    responses: Schemas.SWriteOffOut,
    auth: 'apikey'
  })
  async writeOff(ctx: Context) {
    ctx.body = await this.tripartiteService.writeOff(ctx.request.body);
  }
}
