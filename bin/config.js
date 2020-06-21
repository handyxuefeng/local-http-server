const config = {
  port: {
    options: "-p,--port <val>",
    description: "设置你的端口号",
    useage: "local-http-server --port 3000",
    default: 3000,
  },
  directory: {
    options: "-d,--directory <val>",
    description: "设置你的目录",
    useage: "local-http-server --directory D:",
    default: process.cwd(),
  },
  host: {
    options: "-h,--host <val>",
    description: "设置主机名",
    useage: "local-http-server --host 127.0.0.1",
    default: "localhost",
  },
};

module.exports = config;