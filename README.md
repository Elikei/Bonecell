# Bonecell🦴

## 初始化步骤
1. 在config.yaml中添加项目路径
2. (可选) 添加快捷方式（添加后会导致功能不可用）
`alias bone='node [bonecell.js路径]'`

## 支持操作
* list 输出某项目某api组下的所有api
`node bonecell.js list testProj testApiGroup`

* new 为某项目生成api组
`node bonecell.js new testProj MyApiGroup`

* add 为某项目某api组下添加api
`node bonecell.js add testProj testApiGroup MyAPI`
