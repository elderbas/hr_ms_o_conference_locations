# Conference App: Location Microservice

# TLDR;

- Dependencies are `MongoDB` and `NodeJS`
- `npm install` before you run `npm run dev`
- GET/POST/PUT REST API available + triggers RabbitMQ messages

# FIRST STEPS TO GET THIS GOING

## MongoDB

This app uses MongoDB as its storage for persistent data.

Download instructions for relevant OS here: https://docs.mongodb.com/manual/administration/install-community/

After finishing those steps of installation, open a terminal and run:

```bash
# terminal A
mongod
```

Tip: `MongoDB` by default tries to create its database files at `/data/db` but given some recent OS X updates it blocks write ability to that location, so as the preferred workaround, you may need to set the database path manually or these may help if you can't successfully get `mongod` to run
- https://medium.com/@bryantjiminson/fixing-data-db-not-found-error-in-macos-x-when-starting-mongodb-d7b82abb2479
- https://stackoverflow.com/questions/37702957/mongodb-data-db-not-found


## NodeJS

This server application is written in JavaScript and requires the JS Runtime engine NodeJS

You need to have NodeJS to perform the bash `npm` commands you'll see later
- Download at https://nodejs.org/en/


Then you'll also need to make sure all relevant third-party NodeJS libraries that the server depends on are downloaded using

```bash
# terminal B
$ npm install # this usually takes a while

$ npm run dev # will result in seeing
Express server listening on http://0.0.0.0:9000, in development mode
```

# RabbitMQ Publishing

All `Create` and `Update` actions of `Location`s that succeed will trigger a publishing of the relevant object to durable the following RabbitMQ `fanout` exchanges by name
- Create: 'location.create'
- Update: 'location.modify'

## Example snippets of consuming
See https://gist.github.com/elderbas/60d7c920a69e145aa922080ef9922759 for example `JavaScript` code of consuming messages published

---
---

# REST API Docs

## Create a Location 
## POST http://localhost:9000/api/locations/

```
// example body 
{
  "name" : String,
  "physicalAddress" : String,

  // at least 1 room required
  "rooms" : Array<{|
    "floorNum": String,
    // roomNums must be unique per Location
    "roomNum": String,
    "maximumOccupancyNum": Number,
  |}>
  "mezzanineAreas" : Array<{| 
    "floorNum" : String,
    "maxNumPossibleBoothSpaces" : Number,
  |}>
}
```

## POST Response
```
{
  "_id": String,
  "name" : String,
  "physicalAddress" : String,

  // at least 1 room required
  "rooms" : Array<{|
    "_id": String,
    "floorNum": String,
    // roomNums must be unique per Location
    "roomNum": String,
    "maximumOccupancyNum": Number,
  |}>
  "mezzanineAreas" : Array<{|
    "_id": String,
    "floorNum" : String,
    "maxNumPossibleBoothSpaces" : Number,
  |}>
}
```

## Update a Location and/or Room|MezzanineAreas (Can't DELETE Rooms or MezzanineAreas)
## PUT http://localhost:9000/api/locations/:id

```
// example body 
{
  "_id": String,
  "name" : String,
  "physicalAddress" : String,

  // at least 1 room required
  "rooms" : Array<{|
    "_id": String,
    "floorNum": String,
    // roomNums must be unique per Location
    "roomNum": String,
    "maximumOccupancyNum": Number,
  |}>
  "mezzanineAreas" : Array<{| 
    "_id": String,
    "floorNum" : String,
    "maxNumPossibleBoothSpaces" : Number,
  |}>
}
```



## Get all existing Location objects
## GET http://localhost:9000/api/locations/
```
Array<
  {
    "_id": String,
    "name" : String,
    "physicalAddress" : String,

    // at least 1 room required
    "rooms" : Array<{|
      "_id": String,
      "floorNum": String,
      // roomNums must be unique per Location
      "roomNum": String,
      "maximumOccupancyNum": Number,
    |}>
    "mezzanineAreas" : Array<{| 
      "_id": String,
      "floorNum" : String,
      "maxNumPossibleBoothSpaces" : Number,
    |}>
  }
>
```

## Get a single Location object
## GET http://localhost:9000/api/locations/:id
```
{
  "_id": String,
  "name" : String,
  "physicalAddress" : String,

  // at least 1 room required
  "rooms" : Array<{|
    "_id": String,
    "floorNum": String,
    // roomNums must be unique per Location
    "roomNum": String,
    "maximumOccupancyNum": Number,
  |}>
  "mezzanineAreas" : Array<{| 
    "_id": String,
    "floorNum" : String,
    "maxNumPossibleBoothSpaces" : Number,
  |}>
}
```

