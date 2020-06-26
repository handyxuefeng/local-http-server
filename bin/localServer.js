#! /usr/bin/env node

const program = require("commander");
const package = require("../package.json");
const config = require("./config");
const Server = require("../src/server");  //导入创建好的Server模块

program.usage("[args]");
program.version = package.version;
config.version = package.version;
Object.values(config).forEach((val) => {
  if (val.options) {
    program.option(val.options, val.description);
  }
});

program.on("--help", () => {
  console.log("\r\nExamples:");
  Object.values(config).forEach((val) => {
    if (val.useage) {
      console.log(" \n " + val.useage);
    }
  });
});

//解析用户参数
let resultConfig = {};
let parserObj = program.parse(process.argv);

let keys = Object.keys(config);
keys.forEach((key) => {
  resultConfig[key] = parserObj[key] || config[key]["default"];
});

console.log("resultConfig", resultConfig);

//  创建Server实列
let httServer = new Server(resultConfig);
    httServer.start();
 
