import { provide, Context, inject } from 'midway';
import { IBannerService } from '../../lib/services/banner';
import { BaseController } from '../../base/base.controller';
import * as schema from '../../lib/schemas/banner';
import {
  SwaggerJoiController as sjc,
  // SwaggerJoiPost as sjp,
  SwaggerJoiGet as sjg
} from 'midway-joi-swagger2';

@provide()
@sjc({ api: 'banner', path: '/api/banner' })
export default class BannerController extends BaseController {
  @inject()
  private bannerService: IBannerService;

  @sjg({
    api: 'banner',
    path: '/',
    summary: 'find',
    query: schema.SFindIn,
    responses: schema.SFindOut,
    description: 'banner列表'
  })
  async find(ctx: Context) {
    ctx.body = await this.bannerService.find(ctx.query);
  }

  @sjg({
    api: 'banner',
    path: '/swiper',
    summary: 'swiper',
    query: schema.SSwiperIn,
    responses: schema.SSwiperOut,
    description: 'banner列表'
  })
  async swiper(ctx: Context) {
    ctx.body = await this.bannerService.swiper(ctx.query);
  }
}
