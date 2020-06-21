## npm 插件包的开发流程，这里以开发一个front-static-http-server为例

## 步骤
- 在目录下创建一个bin目录，里面创建一个localServer.js文件
- 配置脚本的执行环境 ，在 localServer.js的第一行配置 #! /usr/bin/env node
- 在package.json中配置好key = bin的隐射
```
{
  "name": "front-static-http-server",
  "version": "1.0.2",
  "description": "",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [
    "front-static-http-server"
  ],
  "author": "",
  "license": "ISC",
  "bin": {
    "front-static-http-server": "./bin/localServer.js",
    "lhs": "./bin/localServer.js"
  },
  "dependencies": {
    "commander": "^5.1.0",
    "mime": "^2.4.6"
  },
  "devDependencies": {
    "ejs": "^3.1.3"
  }
}


```

- 在本项目下执行  npm link 命令 ,则会把建立一个软链


## 发布插件到npmjs.org
- 注册一个npmjs账号
- 在目录下创建一个.npmignore
```
.vscode
public
```
- 在终端运行npm addUser,完成账号的输入
- 在终端运行npm publish 完成发布
