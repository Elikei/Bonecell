# /usr/src/nodejs/hello-docker/Dockerfile
FROM node:10.0
# 在容器中创建一个目录
RUN mkdir -p /usr/local/nodejs/
# 定位到容器的工作目录
WORKDIR /usr/local/nodejs/
# RUN/COPY 是分层的，package.json 提前，只要没修改，就不会重新安装包
COPY package.json /usr/local/app/package.json
RUN cd /usr/local/app/
RUN npm i --registry=https://registry.npm.taobao.org
# 把当前目录下的所有文件拷贝到 Image 的 /usr/local/nodejs/ 目录下
COPY . /usr/local/nodejs/
EXPOSE 17212
RUN /bin/cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && echo 'Asia/Shanghai' >/etc/timezone
ENV NODE_ENV=${EGG_SERVER_ENV}
CMD echo 1
CMD ["npm", "start"]