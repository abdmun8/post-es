const excelToJson = require("convert-excel-to-json");
const { Client } = require("@elastic/elasticsearch");

var DATE_VALID = {
  3: { start: 24, end: 31 },
  4: { start: 1, end: 30 },
  5: { start: 1, end: 4 },
};

Date.prototype.addHours = function (h) {
  this.setTime(this.getTime() + h * 60 * 60 * 1000);
  return this;
};

function generateTimestampByMonth(month) {
  const year = 2021;
  const day = randBetween(DATE_VALID[month].start, DATE_VALID[month].end);
  const dt = new Date(year, month - 1, day);
  const ndt = dt.addHours(10);
  const sdt = ndt.toISOString();
  const arrdt = sdt.split("T");
  const second = arrdt[1].split(".");
  return `${arrdt[0]}T${generateHour(12)}.${second[1]}`;
}

function generateTimestampByDate(dtStr) {
  let dt;
  if (typeof dtStr === "string") {
    dt = new Date(dtStr);
  } else {
    dt = dtStr;
  }
  const ndt = dt.addHours(10);
  const sdt = ndt.toISOString();
  const arrdt = sdt.split("T");
  const second = arrdt[1].split(".");
  return `${arrdt[0]}T${generateHour(12)}.${second[1]}`;
}

function generateHour(number) {
  const hour = number.toString().padStart(2, "0");
  const rand1 = randBetween(0, 59);
  const rand2 = randBetween(0, 59);
  const minute = rand1.toString().padStart(2, "0");
  const second = rand2.toString().padStart(2, "0");
  return `${hour}:${minute}:${second}`;
}

function randBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

var SAMPLE_DATA = {
  index: ".logs-tmt-2021.16",
  body: {
    Level: "Warning",
    "@timestamp": "2021-04-01T08:56:36.664Z",
    "@version": "1",
    MessageTemplate: "Custom log entry X",
    headers: {
      http_accept: null,
      http_version: "HTTP/1.1",
      request_path: "/",
      content_length: "1335",
      http_user_agent: null,
      content_type: "application/json; charset=utf-8",
      http_host: "10.2.2.23:5000",
      request_method: "POST",
    },
    Properties: {
      RequestProtocol: "HTTP/2.0",
      Source: "TCA",
      RequestHost: "mytrakindoappsnew.trakindo.co.id",
      RequestQuery: "",
      RequestUser: "mulyadi@ptcoates.com",
      RequestSoldToId: "",
      RequestSalesOffice: "",
      RequestRole: "CUSTOMER_MANGEMENT_SERVICE_TRACKING",
      RequestPath: "/api/UserAccount/insert_user_deviceId",
      TraceId: "80000549-0000-f000-b63f-84710c7967bb",
      RequestCustomerName: "",
      RequestSalesOfficeDesc: "",
      SourceContext: "TrakindoAPI.Extension.LoggingMiddleware",
      StatusCode: 200,
    },
    host: "10.2.14.10",
    RenderedMessage: "Custom log entry X",
    Timestamp: "2021-05-21T06:56:07.3929632+07:00",
  },
};

function generateResultFromDate(result) {
  const dataArr = result.slice(1).map((item) => {
    return {
      ...SAMPLE_DATA,
      body: {
        ...SAMPLE_DATA.body,
        ["@timestamp"]:
          typeof item["A"] === "number"
            ? generateTimestampByMonth(item["A"])
            : generateTimestampByDate(item["A"]),
        Properties: {
          ...SAMPLE_DATA.body.Properties,
          RequestUser: item["B"],
          RequestSoldToId: item["C"].toString().padStart(10, "0"),
          RequestCustomerName: item["D"],
          RequestRole: item["E"],
        },
      },
    };
  });
  return dataArr;
}

const result = excelToJson({ sourceFile: "data-master.xlsx" });
// console.log(result.last_activity);
const data = generateResultFromDate(result.promo_activity);
// console.log(data);

// const keys = [
//   "last_activity",
//   "registered",
//   "pw_change",
//   "utilization",
//   "promo_activity",
//   "company",
//   "Sheet7",
// ];

const client = new Client({
  node: "http://10.2.2.23:9200",
  auth: {
    username: "elastic",
    password: "changeme",
  },
});

var log = { success: 0, fail: 0 };

for (let i = 0; i < data.length; i++) {
  const item = data[i];
  // console.log(item);
  client
    .index(item)
    .then((resp) => log.success++)
    .catch((err) => log.fail++);
}
