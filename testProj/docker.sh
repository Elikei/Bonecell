# 先删除之前的容器
echo "remove old container"
docker ps -a | grep node-demo | awk '{print $1}'| xargs docker rm -f
# 删除之前的镜像
echo "remove old image"
docker rmi node-demo

# 构建镜像
docker build -t node-demo .
# 打印当前镜像
echo "current docker images"
docker images | grep node-demo
# 启动容器
# ${EGG_SERVER_ENV} 是jekins中配置的参数[local-本地,unittest-测试,prod-生产]
echo "start container"
docker run -d --name node-demo -p 2002:2002 -e EGG_SERVER_ENV=${EGG_SERVER_ENV} --privileged=true node-demo
# 打印当前容器
echo "current container"
docker ps -a | grep node-demo
echo "star service success!"