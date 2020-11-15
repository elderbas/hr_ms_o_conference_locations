import { Router } from 'express'
import _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import mongoose, {LocationModel} from '../services/mongoose';
const router = new Router();

function isValidLocationShape(location) {
  const hasEnoughRooms = location.rooms.length >= 1;
  const hasEnoughMezzanineAreas = location.mezzanineAreas.length >= 1;
  
  const roomNumsSubmitted = location.rooms.map((r) => r.roomNum);
  const roomNumbersAreAllUnique = 
    Array.from(new Set(roomNumsSubmitted)).length === roomNumsSubmitted.length;

  return (
    hasEnoughRooms &&
    hasEnoughMezzanineAreas &&
    roomNumsSubmitted &&
    roomNumbersAreAllUnique
  );
}

function isPreservingImmutables(oldLocation, newLocation) {
  const allOldRoomsAreStillPresent = 
    _.intersection(
      oldLocation.rooms.map(r => r._id), 
      newLocation.rooms.map(r => r._id)
    ).length === oldLocation.rooms.map(r => r._id).length
  
  const allOldMezzanineAreasAreStillPresent = 
    _.intersection(
      oldLocation.mezzanineAreas.map(r => r._id), 
      newLocation.mezzanineAreas.map(r => r._id)
    ).length === oldLocation.mezzanineAreas.map(r => r._id).length

  const allOldItemsStillPresent = 
    allOldRoomsAreStillPresent && allOldMezzanineAreasAreStillPresent;

  return allOldItemsStillPresent;
}


router.get('/api/locations', function (req, res, next) {
  LocationModel.find({}, function (err, locations) {
    if (err) {
      next(err);
    }
    res.json(locations);
  });
});

// will return null if location ID has no result
router.get('/api/locations/:id', function (req, res, next) {
  const _id = req.params.id;
  LocationModel.findById(_id, function (err, location) {
    if (err) {
      next(err);
    }
    res.json(location);
  });
});

// will return null if location ID has no result
router.post('/api/locations', function (req, res, next) {
  if (!isValidLocationShape(req.body)) {
    return res.send({error: 'Location shape is not valid'});
  }

  const location = new LocationModel({ 
    _id: uuidv4(),
    name: req.body.name,
    physicalAddress: req.body.physicalAddress,
    rooms: req.body.rooms.map(r => ({
      ...r,
      _id: uuidv4(),
    })),
    mezzanineAreas: req.body.mezzanineAreas.map(mA => ({
      ...mA,
      _id: uuidv4(),
    })),
  });

  location.save(function (err, location) {
    if (err) return res.send(err);
    res.json(location);
  });
});

router.put('/api/locations/:id', function (req, res, next) {
  console.log('INSIDE!');
  // get the location by id
  
  // verify that there is at least 1 room and 1 mezzanineArea

  // validate that all room numbers within a location are unique
  console.log('req');
  const _id = req.params.id;
  
  // make sure we aren't deleting anything
  LocationModel.findById(_id, function (err, oldLocation) {
    if (err) {
      console.log('err1!');
      return res.send(err);
    }

    const newLocation = req.body;

    // validate 
    if (
        !isPreservingImmutables(oldLocation, newLocation) && 
        isValidLocationShape(newLocation)
      ) {
      return res.send({error: 'Invalid update request'});
    }

    // good to update
    LocationModel.findByIdAndUpdate(_id, req.body, {new: true}, function (err, location) {
      if (err) {
        return res.send({error: err});
      }
      res.json(location);
    });
  });
});





export default router
