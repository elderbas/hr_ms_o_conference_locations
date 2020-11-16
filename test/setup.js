import { EventEmitter } from 'events'
import MongodbMemoryServer from 'mongodb-memory-server'
import mongoose from '../src/services/mongoose'
import router from '../src/api/';

const bodyParser = require('body-parser')
const express = require("express"); // import express
const request = require("supertest"); // supertest is a framework that allows to easily test web apis
// const mockRequire = require('mock-require');

const amqp = require("amqplib/callback_api");
const fakeAmqp = require("./mocks/mock-amqp");
amqp.connect = fakeAmqp.connect;

const app = express(); //an instance of an express app, a 'fake' express app

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(router);

EventEmitter.defaultMaxListeners = Infinity;
jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

global.Array = Array;
global.Date = Date;
global.Function = Function;
global.Math = Math;
global.Number = Number;
global.Object = Object;
global.RegExp = RegExp;
global.String = String;
global.Uint8Array = Uint8Array;
global.WeakMap = WeakMap;
global.Set = Set;
global.Error = Error;
global.TypeError = TypeError;
global.parseInt = parseInt;
global.parseFloat = parseFloat;

let mongoServer;

beforeAll(async (done) => {
  jest.setTimeout(10000);
  mongoServer = new MongodbMemoryServer();
  const mongoUri = await mongoServer.getUri();
  await mongoose.connect(mongoUri, (err) => {
    if (err) console.error(err);
    done();
  });
});

afterAll(async (done) => {
  await mongoose.disconnect();
  await mongoServer.stop();

  done();
});

afterEach(async (done) => {
  const { collections } = mongoose.connection;
  const promises = [];
  Object.keys(collections).forEach((collection) => {
    promises.push(collections[collection].deleteMany({}));
  });

  await Promise.all(promises);
  done();
});

describe("testing-server-routes", () => {
  it("POST /api/locations - success", async (done) => {
    const location = {
      "name" : "what",
      "physicalAddress" : "kekeke",
      "rooms" : [ 
        {
          "floorNum" : "22222",
          "roomNum" : "3333",
          "maximumOccupancyNum" : 23243
        },
        {
          "floorNum" : "22222",
          "roomNum" : "22123123",
          "maximumOccupancyNum" : 23243
        }
      ],
      "mezzanineAreas" : [ 
        {
          "floorNum": "123123",
          "maxNumPossibleBoothSpaces" : 222
        }
      ]
    };

    const result = 
      await request(app)
          .post("/api/locations")
          .type('json')
          .send(location);

    expect(result.body.name).toEqual(location.name);
    expect(result.body.physicalAddress).toEqual(location.physicalAddress);
    expect(result.body._id).not.toEqual(undefined);
    
    expect(result.body.rooms.length).toEqual(location.rooms.length);
    expect(result.body.mezzanineAreas.length).toEqual(location.mezzanineAreas.length);

    result.body.rooms.forEach(((createdRoom) => {
      expect(createdRoom._id).not.toEqual(undefined);
    }));

    result.body.mezzanineAreas.forEach(((createdMezzanineArea) => {
      expect(createdMezzanineArea._id).not.toEqual(undefined);
    }));

    done();
  });
});