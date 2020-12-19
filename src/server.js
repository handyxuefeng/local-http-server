/**
 * 导入系统的核心相关核心模块
 * 1. 可读流：createReadStream
 * 2. 可写流：createWriteStream
 * 3. 文件同步读取方法：readFileSync
 * 4.
 */
const http = require("http");
const { createReadStream, createWriteStream, readFileSync } = require("fs");
const fs = require("fs").promises; //把fs中的方法都promisify化
const path = require("path");
const url = require("url");
const crypto = require("crypto");

/**
 * 安装和导入需要的第三方模块
 * 1. npm install ejs  -g  || yarn add ejs  渲染ejs模板
 * 2. npm install mime -g  || yarn add mime 用来识别文件的类型
 * 3. npm install chalk 用来在终端中打印颜色
 */
const mime = require("mime");
const chalk = require("chalk");
const ejs = require("ejs");

const template = readFileSync(path.resolve(__dirname, "template.ejs"), "utf8");
let htmlTemplate = readFileSync(
  path.resolve(__dirname, "htmlTemplate.txt"),
  "utf8"
);

class Server {
  constructor(opts) {
    this.host = opts.host;
    this.port = opts.port;
    this.directory = opts.directory;
    this.template = template;
  }
  /**
   * node端实现gzip
   * @param {*} eq
   * @param {*} res
   */
  gzip(req, res) {
    let acceptEncoding = req.headers["accept-encoding"]; //拿到accept-encoding请求头
    if (acceptEncoding && acceptEncoding.includes("gzip")) {
      res.setHeader("Content-Encoding", "gzip"); //浏览器支持的话，则设置响应头
      return require("zlib").createGzip(); //创建转化流
    }
    return false;
  }
  /**
   * 判断客户端发过来的文件请求是否有已经访问过，是的话，则从缓存里面取
   * @param {*} req
   * @param {*} res
   * @param {*} filepath
   * @param {*} statObj
   */
  async cache(req, res, filepath, statObj) {
    let fileContent = await fs.readFile(filepath); //获取文件内容,用于生成内容hash
    let ifNoneMatch = req.headers["if-none-match"];
    let etage = crypto.createHash("md5").update(fileContent).digest("base64");

    let ifModifiedSince = req.headers["if-modified-since"];
    let lastModified = statObj.ctime.toGMTString();

    res.setHeader("Expires", new Date(Date.now() + 10 * 1000).toGMTString()); //设置强缓存
    res.setHeader("Cache-Control", "max-age=10"); //设置强缓存，相对时间

    res.setHeader("Last-Modified", lastModified);
    res.setHeader("Etag", etage);

    //配对使用
    if (ifNoneMatch !== etage) {
      return false;
    }

    //配对使用
    if (ifModifiedSince !== lastModified) {
      return false;
    }
    return true;
  }
  /**
   * 浏览器输入的url是个文件时的处理流程
   * @param {*} req
   * @param {*} res
   * @param {*} filepath
   * @param {*} statObj
   */
  /**
   * 页面访问是出错的的异常处理
   * @param {*} req
   * @param {*} res
   * @param {*} e
   */
  sendError(req, res, e) {
    console.log("发生了错误,error = ", e);
    res.setHeader("Content-Type", "text/html;charset=utf-8");
    res.end(`${decodeURIComponent(req.url)} 是不存在--404`);
  }

  async sendFileToClient(req, res, filepath, statObj) {
    //如果是个文件的话，则直接输出
    let fileType = mime.getType(filepath); //得到文件类型

    //1.缓存处理
    try {
      let cache = await this.cache(req, res, filepath, statObj);
      if (cache) {
        res.statusCode = 304;
        return res.end();
      }
    } catch (error) {
      this.sendError(req, res, error);
    }

    //2.防盗链处理
    let referer = req.headers["referer"] || req.headers["referrer"];
    let refererHost = '';
    let pictureHost = req.headers['host'];
    //针对图片做防盗链
    if (/\.jpe?g|png/g.test(req.url)) {
      if (referer) {
        //如果有referer,则再获取改
        refererHost = url.parse(referer).host;
        if (pictureHost != refererHost) {
          console.log(
            "图片的host和引用图片的refer不一致,pictureHost",
            pictureHost,
            "refererHost = ",
            refererHost
          );
          return createReadStream(path.resolve(__dirname, '404.jpg')).pipe(res);
        }
      }
    }



    //3.判断一下浏览器是否支持gzip压缩
    let gzip = this.gzip(req, res);
    res.setHeader("Content-Type", `${fileType};charset=utf-8`);
    if (gzip) {
      //res.setHeader("Conent-Type", fileType); //在响应头里面设置文件的相应类型

      createReadStream(filepath).pipe(gzip).pipe(res);
    } else {
      createReadStream(filepath).pipe(res); //通过pipe管道，边读边输出
    }
  }

  /**
   * 为了支持一些跨域请求，需要设置一些配置
   * @param {*} req
   * @param {*} res
   */
  initHttpRequestConfig(req, res) {
    // cors  允许跨域 允许携带header
    //console.log("method= ", req.method, "请求来源= headers.origin",req.headers.origin || "*" );
    // 1) 配置跨域 当前请求我的源是谁
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*"); // 我允许你 任何网站来访问我
    //2.默认支持 get 和 post  新增哪些方法可以访问
    res.setHeader("Access-Control-Allow-Methods", "OPTIONS,GET,POST,PUT");
    //3.允许授权
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  }

  /**
   * 这个函数就是为了处理客户端发来请求
   * @param {//这个函数就是为了处理客户端发来请求} req
   * @param {*} res
   */
  async httpHandler(req, res) {
    this.initHttpRequestConfig(req, res);

    let filepath = "";
    let { pathname } = url.parse(req.url);

    /**
     当页面上访问：http://localhost:3000/public/中国编码.txt时 会被解析成如下地址
     http://localhost:3000/public/%E4%B8%AD%E5%9B%BD%E7%BC%96%E7%A0%81.txt，
     所以需要对url进行decodeURIComponent
    */
    pathname = decodeURIComponent(pathname); // 将中文进行一次转义
    filepath = path.join(this.directory, pathname);



    try {
      let statObj = await fs.stat(filepath);
      if (statObj.isFile()) {
        this.sendFileToClient(req, res, filepath, statObj);
      } else {
        //列出所有目录
        this.showAllDirectoryAndFile(req, res, pathname, filepath, statObj);
        /*
        // 文件夹 文件夹先尝试找index.html
        let concatfilePath = path.join(filepath, "index.html");
        // 如果存在 html
        /*
        try {
          let statObj = await fs.stat(concatfilePath);
          this.sendFileToClient(req, res, concatfilePath, statObj);
        } catch (e) {
          // 列出目录结构
          this.showAllDirectoryAndFile(req, res, pathname, filepath, statObj);
        }
        */
      }
    } catch (error) {
      this.sendError(req, res, error);
    }
  }

  /**
   * 列出所有url下的所有文件和目录
   * @param {*} req
   * @param {*} res
   * @param {*} pathname
   * @param {*} filepath
   * @param {*} statObj
   */
  async showAllDirectoryAndFile(req, res, pathname, filepath, statObj) {
    /**
      根据传递过来的目录，读出目录下的文件和目录
      * dirs =  [
        '.vscode',
        'bin',
        'node_modules',
        'package-lock.json',
        'package.json',
        'public',
        'readme.md',
        'src',
        'yarn.lock'
      ]
      */
    let dirs = await fs.readdir(filepath);
    //console.log("dirs = ", dirs);
    try {
      let parseObj = dirs.map((item) => {
        return {
          dir: item,
          href: path.join(pathname, item),
        };
      });
      /**
            2. 拼装对象
             拼装好的json对象为: [
              { dir: '.vscode', href: '/.vscode' },
              { dir: 'bin', href: '/bin' },
              { dir: 'node_modules', href: '/node_modules' },
              { dir: 'package-lock.json', href: '/package-lock.json' },
              { dir: 'package.json', href: '/package.json' },
              { dir: 'public', href: '/public' },
              { dir: 'readme.md', href: '/readme.md' },
              { dir: 'src', href: '/src' },
              { dir: 'yarn.lock', href: '/yarn.lock' }
            ]
          */
      // console.log("拼装好的json对象为:", parseObj);

      /**
       * 1.第一种方式，通过ejs引擎渲染模板
       
      this.getTemplateHtmlStr(parseObj).then((htmlTemplate) => {
        console.log("data = ", htmlTemplate);
        res.setHeader("Content-Type", "text/html;charset=utf-8");
        res.end(htmlTemplate);
      });

      */

      /**
       * 2.自定义模板引擎规则实现模板渲染
       */
      this.renderTemplateToHtml(parseObj, (htmlStr) => {
        if (htmlStr) {
          //console.log("htmlStr = ", htmlStr);
          res.setHeader("Content-Type", "text/html;charset=utf-8");
          res.end(htmlStr);
        }
      });
    } catch (error) {
      this.sendError(req, res, error);
    }
  }

  /**
   * 利用ejs来渲染模板，也可以自己手写一个模板引擎
   * @param {*} parseObj
   */
  getTemplateHtmlStr(parseObj) {
    let promise = ejs.render(
      this.template,
      { dirs: parseObj },
      { async: true }
    );
    return promise;
  }

  /**
   * node中通过函数回调的形式实现异步编程
   * @param {*} parseObj
   * @param {*} callback
   */
  renderTemplateToHtml(...args) {
    const [parseObj, callback] = [...args];
    const reg = /\{\{([^}]+)\}\}/g;
    const regReplacePercentFalg = /\{\%([^%]+)\%\}/g; //替换{%%} 的正则
    //console.log("this.template = ", htmlTemplate);
    //1.先把html模板中{{name}} 格式的替换成${name}

    htmlTemplate = htmlTemplate.replace(reg, function () {
      return "${" + arguments[1] + "}"; //{{}}
    });

    //2.开始把{% %} 标记的替换掉
    let head = "";
    head += " str+=`";
    htmlTemplate = htmlTemplate.replace(regReplacePercentFalg, function () {
      return "`;" + arguments[1] + ";str+=`";
    });
    let tail = "`";
    let executorStr = `let str=''; with(parseObj){${head + htmlTemplate + tail
      }};return str;`; //通过with固定好作用域
    let fn = new Function("parseObj", executorStr);

    //console.log(fn.toString()); 把匿名函数打印出来
    let resultHtml = fn(parseObj);
    callback(resultHtml); //调用回调函数，把替换后的模板字符传返回给主函数renderFile
  }

  start() {
    let server = http
      .createServer(this.httpHandler.bind(this))
      .listen(this.port, this.host, () => {
        console.log(
          chalk.yellow(
            `${this.host}:${this.port},已经启动，开始输出${this.directory
              .split("/")
              .pop()} 下的文件`
          )
        );
      });
  }
}

module.exports = Server;
