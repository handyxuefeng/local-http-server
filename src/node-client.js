/**
 * 这里是模拟把node作为中间层，向其他的语言的后端发起请求，比如java服务端
 */
const http = require("http");

let httpClient = http.request(
  {
    path: "/reg",
    hostname: "localhost",
    port: 3000,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  },
  function (res) {
    //这里就是3000端口响应的内容
    res.on("data", (data) => {
      console.log("收到其他服务端返回回来的数据为:", data.toString());
    });
  }
);

/**
 * node 向其他后端语言发起请求，使用的end方法
 */
httpClient.end(`{"username":"linda","pwd":"123456","_t":${Date.now() * 1}}`);
