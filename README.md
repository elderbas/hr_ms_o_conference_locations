# Steps to get this server going

First, you will need to install and run [MongoDB](https://www.mongodb.com/) in another terminal instance.

```bash
$ mongod
```




```
// terminal A
mongod
```

Then, run the server in development mode.

```bash
$ npm run dev
Express server listening on http://0.0.0.0:9000, in development mode
```



```bash
npm test # test using Jest
npm run coverage # test and open the coverage report in the browser
npm run lint # lint using ESLint
npm run dev # run the API in development mode
npm run prod # run the API in production mode
```

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

