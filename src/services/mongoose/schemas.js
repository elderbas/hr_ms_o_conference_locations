import Promise from 'bluebird'
import mongoose from 'mongoose'
import { mongo } from '../../config'

// // MezzanineArea
// {
//   "id": String,
//   "floorNum": String, (user provided, !empty)
//   "maxNumPossibleBoothSpaces": <int>,
// }

// NO DELETION


// const mezzanineAreaSchema = new mongoose.Schema({
//   id: String,
//   floorNum: String,
//   maxNumPossibleBoothSpaces: Number,
// });

// const roomSchema = new mongoose.Schema({
//   id: String,
//   floorNum: String,
//   roomNum: String, 
//   maximumOccupancyNum: Number,
// });
// const locationSchema = new mongoose.Schema({
//   id: String,
//   name: String,
//   physicalAddress: String,
  
//   // - all roomNums within a location must be unique
//   // - must 1 have or more rooms
//   rooms: [roomSchema], 

//   // 1 or more mezzanine areas
//   mezzanineAreas: [mezzanineAreaSchema],
// });

// const MezzanineAreaModel = mongoose.model('MezzanineArea', mezzanineAreaSchema);
// const RoomModel = mongoose.model('Room', roomSchema);
// const LocationModel = mongoose.model('Location', locationSchema);

// const newRoom = new RoomModel({id: '123123123', floorNum: '123123', roomNum: '123123', maximumOccupancyNum: 123});

// newRoom.save(function (err, newRoom) {
//   if (err) return console.error(err);
//   console.log(newRoom);
// });

// // NOTE: methods must be added to the schema before compiling it with mongoose.model()
// kittySchema.methods.speak = function () {
//   const greeting = this.name
//     ? "Meow name is " + this.name
//     : "I don't have a name";
//   console.log(greeting);
// }

// const Kitten = mongoose.model('Kitten', kittySchema);

// const fluffy = new Kitten({ name: 'fluffy' });
// fluffy.speak(); // "Meow name is fluffy"

// fluffy.save(function (err, fluffy) {
//   if (err) return console.error(err);
//   fluffy.speak();
// });

// Kitten.find(function (err, kittens) {
//   if (err) return console.error(err);
//   console.log(kittens);
// })

// Kitten.find({ name: /^fluff/ }, callback);