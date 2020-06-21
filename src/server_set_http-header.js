// 实现一个http服务器 客户端会发送请求 GET？ / POST(请求体) 
// 要处理不同的请求体的类型 (表单格式 a=1&b=2 formData) (JSON "{"name":"jackie"}")  文件格式 二进制
// ajax (跨域问题) 提交数据 表单格式 (可以直接通信)

const http = require('http');
const url = require('url');
const querystring = require('querystring');
const { createContext } = require('vm');

let server = http.createServer();

server.on('request', (req, res) => {
    let { pathname } = url.parse(req.url); // 页面发送的请求url
    // 需要配置跨域头 你访问我 如果不支持跨域
    // cors  允许跨域 允许携带header
    console.log("method= ", req.method, "请求来源= headers.origin", req.headers.origin || "*");
    // 1) 配置跨域 当前请求我的源是谁
    res.setHeader('Access-Control-Allow-Origin',req.headers.origin || "*"); // 我允许你 任何网站来访问我

    //2.默认支持 get 和 post  新增哪些方法可以访问
    res.setHeader('Access-Control-Allow-Methods','OPTIONS,GET,POST,PUT');

    res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');
   

    //可以设置 当前options 的发送频率  一般30分钟
    // res.setHeader('Access-Control-Max-Age','30')


    // 预检请求 ： 先发一个尝试的请求 ， 如果能跑通在发送真正的请求

    // 如果碰到options请求 直接成功即可

    if(req.method === 'OPTIONS'){
        //console.log('1.这里是http发送的尝试请求options');
        res.statusCode = 200;
        res.end(); // 内部会自己判断 是否增加了跨域头
    }

    // 2) 解析请求体 

   let arr = [];
   //监听post请求体，发送过来的参数
   req.on("data", (data) => {
     console.log("data===:", data.toString());
     arr.push(data);
   });

   req.on("end", () => {
    /**
     * 页面请求参数
     * requestParams = 'username=12121&password=1111'
     */ 
    let requestParams = Buffer.concat(arr).toString();
 
    let requestType = req.headers['content-type'];
   
    console.log("页面请求参数为:", requestParams);
    //判断请求头的请求类型
    if(pathname ==='/login'){
         if (requestType && requestType === "application/x-www-form-urlencoded") {
            let paramsObj = querystring.parse(requestParams, "&", "=");
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(paramsObj));
         }
         
    }
    else if(pathname ==='/reg'){
        //如果请求的类型是json格式的
        if(requestType==='application/json') {
             let result = JSON.parse(requestParams);
             res.setHeader("Content-Type", requestType);
             res.end(JSON.stringify(result));
        }
        
    }
    else{
         res.setHeader("Content-Type", "text/html;charset=utf-8");
         res.end("页面请求路径为=," + pathname);
    }

   });




});


server.listen(3000,()=>{
    console.log('3000端口已经启动。。。。。。。')
});