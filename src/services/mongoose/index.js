import Promise from 'bluebird'
import mongoose from 'mongoose'
import { mongo } from '../../config'

Object.keys(mongo.options || { }).forEach((key) => {
  mongoose.set(key, mongo.options[key])
})

mongoose.Promise = Promise
/* istanbul ignore next */
mongoose.Types.ObjectId.prototype.view = function () {
  return { id: this.toString() }
}

/* istanbul ignore next */
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error: ' + err)
  process.exit(-1)
})
mongoose.connection.once('open', () => {
  console.log('we are connected to mongo! (services/mongoose/index.js)');
});

const mezzanineAreaSchema = new mongoose.Schema({
  _id: {type: String},
  floorNum: {type: String, required: true},
  maxNumPossibleBoothSpaces: {type: Number, required: true},
});

const roomSchema = new mongoose.Schema({
  _id: String,
  floorNum: {type: String, required: true},
  roomNum: {type: String, required: true},
  maximumOccupancyNum: {type: Number, required: true},
});

const locationSchema = new mongoose.Schema({
  _id: String,
  name: {type: String, required: true},
  physicalAddress: {type: String, required: true},
  
  // - all roomNums within a location must be unique
  // - must 1 have or more rooms
  rooms: [roomSchema],

  // // 1 or more mezzanine areas
  mezzanineAreas: [mezzanineAreaSchema],
});

// export const MezzanineAreaModel = mongoose.model('MezzanineArea', mezzanineAreaSchema);
export const RoomModel = mongoose.model('Room', roomSchema);
export const LocationModel = mongoose.model('Location', locationSchema);

export default mongoose
