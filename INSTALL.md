#kingke

## 开发准备

* [微信公众平台测试号](http://mp.weixin.qq.com/debug/cgi-bin/sandbox?t=sandbox/login)
* 一台服务器（本人使用ubuntu 14.0 64位）
* [meteor文档](https://www.meteor.com/tutorials/blaze/creating-an-app)

## 搭建环境

### 安装meteor
```
curl https://install.meteor.com/ | sh
```

### 下载项目
```
git clone https://git.coding.net/mengning/kingke.git
cd kingke
```

### 修改配置文件
```
vim server/config.js
```

### 初次启动项目
```
meteor npm install --save marked
sudo meteor --port 80
```
此时你可以在`http://你服务器的ip地址`上看到运行效果

### 查看mongo数据库
本命令需要在meteor运行的情况下才能使用
```
meteor mongo
use meteor
```

#### 插件说明
* jparker:crypto-sha1
    * 提供sha1加密函数，在微信token验证中使用
    * [文档地址](https://github.com/p-j/meteor-crypto-sha1)
* iron:router
    * 为meteor提供路由功能，方便创建不同的访问路径以满足不同的功能
    * [文档地址](http://iron-meteor.github.io/iron-router/)
* meteorhacks:ssr
    * 为server端函数提供返回html模板的功能，meteor原生只有在client中的函数能调用html模板
    * [文档地址](https://atmospherejs.com/meteorhacks/ssr)
* http
    * meteor原生api，为项目提供http请求的方法，用于与微信服务器交互
    * [文档地址](https://docs.meteor.com/api/http.html)
* peerlibrary:xml2js
    * xml-json互相转换插件
    * [文档地址](https://github.com/peerlibrary/meteor-xml2js)

### 为你的ip绑定域名
1. 因为微信官方为了安全需要，只有绑定域名的服务器才能提供微信后台服务，所以请自己为服务器绑定域名,或向老师寻求帮助。
2. 微信只允许80端口的网站做后台，所以默认的3000端口无法提供服务，使用如下命令修改服务端口。加sudo是因为在ubuntu上，小于1024的端口需要管理员身份进行绑定。
```
sudo meteor --port 80
```
此时你可以在`http://你的新域名`上看到运行效果
PS:如果启动失败，你可以查看错误信息，网上搜索后解决，文末提供了一种解决办法

### 微信测试号进行设置
1. 接口配置信息
    * url:http://你的域名/weixin
    * token:你自己的密码
    * 点击**提交**，如果成功显示**配置成功**
2. 体验接口权限表-网页服务-网页帐号-网页授权获取用户基本信息-修改
    * url:你的域名
3. 访问http://你的域名/setmenu
    * 成功显示`set success{"errcode":0,"errmsg":"ok"}`
    * 如果与上方结果不同，根据errmsg查找系统bug
4. 取关并重新关注你的微信公众号，以刷新下方个人信息按钮
    * 成功则显示`来自 某国 某省 某市 的 某某某 您好`
    * 失败则根据页面提示查找bug
5. 设置消息模板
    * 新增课程模板
        * 复制模板ID到config.js中
        * 点击发通知按钮即可发送
    * 新增关注消息模板
        * 复制模板ID到config.js中

课程模板
```
{{first.DATA}}
课程名：{{keyword1.DATA}}
教师：{{keyword2.DATA}}
时间：{{keyword3.DATA}}
{{remark.DATA\}}
```
关注消息模板
```
{{text.DATA}}
```

## 如果无法在80端口上启动meteor
PS：如果你成功在80端口上启动meteor，请跳过本段
使用一种叫做**nginx**的软件将http的80接口代理到meteor默认运行的3000接口上

### 安装nginx
```
sudo apt-get install nginx
```

### 添加配置文件
添加配置文件
```
sudo touch /etc/nginx/conf.d/meteor.conf
sudo vim /etc/nginx/conf.d/meteor.conf
```

meteor.conf配置如下
```
server{
  listen 80;
  location / {
    proxy_pass http://localhost:3000/;
  }
}
```

修改nginx.conf配置文件 大约在70行左右 加上#号
```
sudo vim /etc/nginx/nginx.conf
```
```
#include /etc/nginx/sites-enabled/*
```

### 重启nginx
```
sudo service nginx restart
```

## 编写代码
在写完代码后，建议使用(eslint)[http://eslint.org/]进行代码检查，确认无错再提交
