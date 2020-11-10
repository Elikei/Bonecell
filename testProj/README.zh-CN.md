# advokate-fun-points-midway

fun points 后台

## 快速入门

<!-- 在此次添加使用文档  -->

### 项目结构

```项目结构
.
├── README.md
├── README.zh-CN.md
├── dist                                ---- 编译后目录
├── database                            ---- sequelize v5
│   └── migrations                      ---- db migrations
│       ├── 20190527062554-init-*.js    ---- init .js文件数据库创建、upd 修改
│       └── config.json                 ---- config
├── logs                                ---- 本地日志目录
│   └── midway6-test                    ---- 日志应用名开头
│       ├── common-error.log            ---- 错误日志
│       ├── midway-agent.log            ---- agent 输出的日志
│       ├── midway-core.log             ---- 框架输出的日志
│       ├── midway-web.log              ---- koa 输出的日志
│       └── midway6-test-web.log
├── package.json
├── src                                 ---- 源码目录
│   ├── app                             ---- web 层目录
│   │   ├── controller                  ---- web 层 controller 目录
│   │   │   ├── home.ts
│   │   │   └── user.ts
│   │   ├── middleware (可选)            ---- web 层中间件目录
│   │   │   └── trace.ts
│   │   ├── public (可选)                ---- web 层静态文件目录，可以配置
│   │   └── view (可选)
│   │       └── home.tpl                ---- web 层模板
│   ├── base                            ---- base 封装
│   │   ├── base.controller.ts
│   │   ├── base.model.ts
│   │   └── base.service.ts
│   ├── config
│   │   ├── config.default.ts
│   │   ├── config.local.ts
│   │   ├── config.prod.ts
│   │   ├── config.unittest.ts
│   │   └── plugin.ts
│   └── lib                             ---- 业务逻辑层目录，自由定义
│   │   ├── models                      ---- model for sequelize-typescript
│   │   │   ├── dbcontext.ts            ---- context
│   │   │   └── user.model.ts           ---- model code helper create
│   │   ├── param-interface             ---- service param interface for in\out
│   │   │   └── user.ts                 ---- multiple param for service
│   │   ├── service                     ---- 业务逻辑层，自由定义
│   │   │   └── user.ts
│   │   └── utils                       ---- 常用工具类
│   │       └── tcmq.ts                 ---- 腾讯云封装provide
│   ├── interface.ts                    ---- 接口定义文件，自由定义
│   ├── app.ts                          ---- 应用扩展文件，可选
│   └── agent.ts                        ---- agent 扩展文件，可选
├── test
│   └── app
│       └── controller
│           └── home.test.ts
├── types                               ---- 自定义*.d.ts
│   └── biguint-format.d.ts
├── tsconfig.json
└── tslint.json
```

如需进一步了解，参见 [midway 文档][midway]。

### 本地开发

```bash
$ yarn i
$ yarn run dev
$ open http://localhost:8060/
```

### 部署

```bash
$ yarn run start
$ yarn run stop
```

### 单元测试

- [midway-bin] 内置了 [mocha], [thunk-mocha], [power-assert], [istanbul] 等框架，让你可以专注于写单元测试，无需理会配套工具。
- 断言库非常推荐使用 [power-assert]。
- 具体参见 [midway 文档 - 单元测试](https://eggjs.org/zh-cn/core/unittest)。

### 内置指令

- 使用 `yarn run lint` 来做代码风格检查。
- 使用 `yarn test` 来执行单元测试。
- 使用 `yarn run autod` 来自动检测依赖更新，详细参见 [autod](https://www.npmjs.com/package/autod)

[midway]: https://midwayjs.org

### migration

```初始化表结构
npx sequelize migration:generate --name=init-users
```

```执行 migrate 进行数据库变更
# 升级数据库
npx sequelize db:migrate
# 如果有问题需要回滚，可以通过 `db:migrate:undo` 回退一个变更
# npx sequelize db:migrate:undo
# 可以通过 `db:migrate:undo:all` 回退到初始状态
# npx sequelize db:migrate:undo:all
```

## 开发规范

### 命名规范

1. 文件夹 小写中横线分词
2. 文件 小写中横线分词
3. 类名 帕斯卡命名
4. 接口名 I+帕斯卡命名
5. schema 命名 S+帕斯卡命名 In\S+帕斯卡命名 Out
6. 方法名 小驼峰
7. 变量名 小驼峰 Model inject 帕斯卡
8. 常量 全大写下划线分词
9. 枚举 E+帕斯卡命名，枚举 item name 帕斯卡命名
10. 命名要求简洁明了 英文命名，如果不明确命名可以采用，类型命名法 如: string1、string2 不允许其他无意义命名
11. 代码层级不允许超过 4 级
12. 鉴于换行等因素 function 不允许超过 60 行
13. 路由命名优先 restful api 定向 api 采用 soa 命名 路由采用全小写中横线分词
14. 注释 方法采用 document this 变量使用/\* \*/
15. private
16. function param type in I[function]In、out I[function]Out
17. 文件必须启用 vscode-fileheader
18. 类作为名词存在，则 action 尽量采用动词，单一职责动词不需要追加名词。
19. 建议命名如下

```bash
controller:
@get('/')
async index(ctx:Context) {}

@get('/:id')
async show(ctx:Context) {}

// 或者采用joi query参数传递
@get('/')
async show(ctx:Context) {}

@post('/')
async create(ctx:Context) {}

@put('/:id') // or body
async update(ctx:Context) {}

@del('/:id') // or query
async destroy(ctx:Context) {}

service:
async findAll(param:IFindAllIn):Promise<Model[]> {}

async findAndCountAll(param: IFindAndCountAllIn): Promise<IFindAndCountAllOut> {}

... findOne ...

async create(param:ICreateIn):Promise<ICreateOut> {}

... update ...

... destroy ...

```

### DataBase

- table\column
  全小写，下划线分词
- 主键  
  id（pk 开头 or sequelize 默认）
- 默认字段
  - created_at
  - updated_at
  - deleted_at
- not null
  - 根据业务值进行默认值设置优先推荐的默认值顺序：''>0>-1>特殊定义
  - datetime、date、timestamp：按照业务需要为 null 的情况下，尽量作为辅助字段，不作为优先筛选字段，例如搭配 state 字段
- function  
  全小写下划线分词，[fun_]开头。根据业务复杂程度尽量不要启用自定义函数。
- view  
  全小写下划线分词，[view_]开头。
- 关系  
  [表名_id]
- 常规业务采用三范式原则，交易、金钱、积分相关业务保证数据留痕，以及性能采用反范式。

### 错误码

- 204  
  前端处理
- 401  
  前端处理-权限错误
  - 401.1 token 失效
  - 401.2 未携带 token
- 422
  后端参数校验错误-message
- 500
  前端处理（后端方法错误）
- 511
  前端处理（已知错误提示）
- 512
  後端处理 (已知错误提示)

### 版本号管理

1. vX.X.X（产品版本.计划版本.bug 修正 or 细节迭代）
2. 小版本 bug 修正 统统 末尾追加
3. git 上各自在自己的（dev\_姓名简写）分支上完成相关代码编写
4. 需发版时，到 github 中进行 `Pull requests` 请求给管理员进行审批后，自动合并到 dev 分支
5. 提交 git 规则(`v当前版本号 '换行' 提交分支 修改内容备注`)，示例如下

```bash
  v1.1.1
  dev 修改内容备注
```
