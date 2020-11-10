/*
 * @Author: 方振起 
 * @Date: 2020-07-29 15:00:05 
 * @Last Modified by: 武彩平
 * @Last Modified time: 2020-10-09 14:51:10
 */

// 功能说明： 用来快速生成 controller service schemas interface 文件 并初始化基本数据
// node ./auto-class.js -class app-product-class
const fs = require('fs');

//直接调用命令
const fileName = process.argv[process.argv.length - 1];
const serviceName = toHump(fileName);
const className = toCamel(fileName);

// controller 写入内容
const conStr = `
import { provide, Context, inject } from 'midway';
import { BaseController } from '../../base/base.controller';
import {
  SwaggerJoiController as sjc,
  SwaggerJoiPost as sjp,
  SwaggerJoiGet as sjg,
  SwaggerJoiDel as sjd,
} from 'midway-joi-swagger2';
import * as Schemas from '../../lib/schemas/${fileName}';
import { I${className}Service } from '../../lib/services/${fileName}';

@provide()
@sjc({
  api: '${fileName}',
  path: '/api/${fileName}',
  description: '商品标签',
})
export class ${className}Controller extends BaseController {
  @inject()
  private ${serviceName}Service: I${className}Service;

  @sjp({
    api: '${fileName}',
    path: '/add',
    summary: 'add',
    description: '添加',
    body: Schemas.SAddIn,
    responses: Schemas.SAddOut,
    auth: 'apikey',
  })
  async add(ctx: Context) {
    ctx.body = await this.${serviceName}Service.add(ctx.request.body);
  }

  @sjg({
    api: '${fileName}',
    path: '/list',
    summary: 'list',
    description: '获取列表',
    query: Schemas.SListIn,
    responses: Schemas.SListOut,
    auth: 'apikey',
  })
  async list(ctx: Context) {
    ctx.body = await this.${serviceName}Service.list(ctx.query);
  }

  @sjg({
    api: '${fileName}',
    path: '/find/{id}',
    summary: 'find',
    pathParams: Schemas.SFindIn,
    responses: Schemas.SFindOut,
    description: '获取信息',
    auth: 'apikey',
  })
  async find(ctx: Context) {
    ctx.body = await this.${serviceName}Service.find(ctx.params);
  }

  @sjd({
    api: '${fileName}',
    path: '/del/{id}',
    summary: 'del',
    pathParams: Schemas.SDelIn,
    responses: Schemas.SDelOut,
    description: '删除',
    auth: 'apikey',
  })
  async del(ctx: Context) {
    ctx.body = await this.${serviceName}Service.del(ctx.params);
  }
}
`;
// serivce 写入内容
const serStr = `
import { provide } from 'midway';
import { BaseService } from '../../base/base.service';
import * as Inter from '../interfaces/${fileName}';

export interface I${className}Service extends ${className}Service {}

@provide()
export class ${className}Service extends BaseService {
  /**
   * 添加数据
   *
   * @param {Inter.IAddIn} param
   * @returns {Promise<Inter.IAddOut>}
   * @memberof ${className}Service
   */
  async add(param: Inter.IAddIn): Promise<Inter.IAddOut> {
    return { id: '1' };
  }

  /**
   * 获取列表
   *
   * @param {Inter.IAddIn} param
   * @returns {Promise<Inter.IListOut>}
   * @memberof ${className}Service
   */
  async list(param: Inter.IListIn): Promise<Inter.IListOut> {
    return {
      items: [{
        id: '',
        name: '',
        sort: 1,
        enable: 1,
        createdAt: '2020-08-1 19:00:00'
      }],
      page: '1',
      pageSize: '10',
      count: 0,
    };
  }

  /**
   * 查询单条数据
   *
   * @param {Inter.IAddIn} param
   * @returns {Promise<Inter.IFindIn>}
   * @memberof ${className}Service
   */
  async find(param: Inter.IFindIn): Promise<Inter.IFindOut> {
    return {
      id: '',
      name: '',
      sort: 1,
      enable: 1
    };
  }

  /**
   * 删除单条数据
   *
   * @param {Inter.IAddIn} param
   * @returns {Promise<Inter.IDelIn>}
   * @memberof ${className}Service
   */
  async del(param: Inter.IDelIn): Promise<Inter.IDelOut> {
    return {
      id: ''
    };
  }
}
`;
// interface 写入内容
const intStr = `
export interface IAddIn {
  name: string;
}

export interface IAddOut {
  id: string;
}

export interface IListIn {
  page: string;
  pageSize: string;
}

export interface IListOut {
  items: any[];
  page: string;
  pageSize: string;
  count: number;
}

export interface IFindIn {
  id: string;
}

export interface IFindOut {
  id: string;
  name: string;
  sort: number;
  enable: number;
}

export interface IDelIn {
  id: string;
}

export interface IDelOut {
  id: string;
}
`;
// schemas 写入内容
const schStr = `
import * as joi from 'joi';

export const SAddIn = {
  name: joi.string().required().description('名称'),
};

export const SAddOut =joi.object().keys({
  id: joi.string().required().description('主键id'),
});

export const SListIn = {
  page: joi.string().required().description('页数'),
  pageSize: joi.string().required().description('每页条数'),
};

export const SListOut = joi.object().keys({
  items: joi
    .array()
    .items({
      id: joi.string().description('id'),
      name: joi.string().description('名称'),
      sort: joi.number().description('排序'),
      enable: joi.number().description('1 未启用 2 启用'),
      createdAt: joi.string().description('时间'),
    })
    .required()
    .description('数据集合'),
  page: joi.string().required().description('当前页数'),
  pageSize: joi.string().required().description('总页数'),
  count: joi.number().required().description('总条数'),
});


export const SFindIn = {
  id: joi.string().required().description('查询的id'),
};

export const SFindOut = joi.object().keys({
  id: joi.string().required().description('ID'),
  name: joi.string().required().description('名称'),
  sort: joi.number().required().description('排序'),
  enable: joi.number().required().description('1 未启用 2 启用'),
});

export const SDelIn = {
  id: joi.string().required().description('删除id'),
};

export const SDelOut = joi.object().keys({
  id: joi.string().description('删除的id'),
});
`;
// 中划线 转 小驼峰
function toHump(name) {
  return name.replace(/\-(\w)/g, (all, letter) => letter.toUpperCase());
}

// 中划线 转 大驼峰
function toCamel(name) {
  return name.replace(/(^|-)(\w)/g, (m, $1, $2) => $2.toUpperCase());
}


// 创建并写入 Controller
function createController() {
  fs.writeFile(`./src/app/controller/${fileName}.ts`, conStr, 'utf8', function (err) {
    if (err)
      console.log('controller 内容写入出错了，错误是：' + err);
    else
      console.log('controller 内容写入 ok');
  })
}

// 创建并写入 Service
function createService() {
  fs.writeFile(`./src/lib/services/${fileName}.ts`, serStr, 'utf8', function (err) {
    if (err)
      console.log('service 内容写入出错了，错误是：' + err);
    else
      console.log('service 内容写入 ok');
  })
}

// 创建并写入 Interfase
function createInterface() {
  fs.writeFile(`./src/lib/interfaces/${fileName}.ts`, intStr, 'utf8', function (err) {
    if (err)
      console.log('interface 内容写入出错了，错误是：' + err);
    else
      console.log('interface 内容写入 ok');
  })
}

// 创建并写入 Schema
function createSchema() {
  fs.writeFile(`./src/lib/schemas/${fileName}.ts`, schStr, 'utf8', function (err) {
    if (err)
      console.log('schemas 内容写入出错了，错误是：' + err);
    else
      console.log('schemas 内容写入 ok');
  })
}


if (process.argv.includes('-controller')) {
  createController()
}

if (process.argv.includes('-service')) {
  createService()
}

if (process.argv.includes('-schemas')) {
  createSchema()
}

if (process.argv.includes('-interface')) {
  createInterface()
}

if (process.argv.includes('-class')) {
  createSchema()
  createInterface()
  createService()
  createController()
}