import { Router } from 'express'
import _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import mongoose, {LocationModel} from '../services/mongoose';
const CircuitBreaker = require('opossum');
const amqp = require('amqplib/callback_api');


const router = new Router();




function createRabbitMQPublisher(exchangeName) {
  function publishLocation(location, isFinishedCb, errCb) {
    const RABBIT_MQ_EXCHANGE_TYPES = {
      FANOUT: 'fanout',
    }
    amqp.connect(process.env.RABBITMQ_URI, {}, function(error0, connection) {
      if (error0) {
        return errCb(error0);
      }
      connection.createChannel(function(error1, channel) {
        if (error1) {
          return errCb(error1);
        }

        const msg = JSON.stringify(location);

        channel.assertExchange(exchangeName, RABBIT_MQ_EXCHANGE_TYPES.FANOUT, {
          durable: false
        });
        channel.publish(exchangeName, '',  Buffer.from(msg));

        isFinishedCb();

        setTimeout(function() {
          connection.close();
        }, 2000);
      });
    });
  }

  return publishLocation;
}

const publishLocationCreation = createRabbitMQPublisher('location.create');
const publishLocationModification = createRabbitMQPublisher('location.modify');


// {location, type: 'create' | 'modify}
let rabbitMQMessagesToSendQueue = [];
let isCurrentlyTryingToRemoveAMessage = false;

setInterval(() => {
  if (rabbitMQMessagesToSendQueue.length > 0 && isCurrentlyTryingToRemoveAMessage === false) {
    isCurrentlyTryingToRemoveAMessage = true;
    let firstElem = rabbitMQMessagesToSendQueue[0];
    if (firstElem.type === 'create') {
      publishLocationCreation(firstElem.location, () => {
        _.remove(rabbitMQMessagesToSendQueue, ({location}) => location._id === firstElem.location._id);
        isCurrentlyTryingToRemoveAMessage = false;
      }, (err) => {
        isCurrentlyTryingToRemoveAMessage = false;
      });
    } else {
      publishLocationModification(firstElem.location, () => {
        _.remove(rabbitMQMessagesToSendQueue, ({location}) => location._id === firstElem._id);
        isCurrentlyTryingToRemoveAMessage = false;
      }, (err) => {
        isCurrentlyTryingToRemoveAMessage = false;
      });
    }
  }
  
}, 4000);



function isValidLocationShape(location) {
  const hasEnoughRooms = location.rooms.length >= 1;
  const hasEnoughMezzanineAreas = location.mezzanineAreas.length >= 1;
  
  const roomNumbersAreAllUnique = (function() {
    const _roomNumsSubmitted = location.rooms.map((r) => r.roomNum);
    return Array.from(new Set(_roomNumsSubmitted)).length === _roomNumsSubmitted.length;
  })();

  return (
    hasEnoughRooms &&
    hasEnoughMezzanineAreas &&
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
// CREATE
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

    function asyncFunctionThatCouldFail() {
      return new Promise((resolve, reject) => {
        publishLocationCreation(location, () => {
          res.json(location);
          resolve();
        }, (err) => {
          console.log('Experienced err trying to publish', err);
          res.json(location);
          reject();
        });
      });
    }

    const options = {
      timeout: 3000, // If our function takes longer than 3 seconds, trigger a failure
      errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
      resetTimeout: 15000 // After 15 seconds, try again.
    };

    const breaker = new CircuitBreaker(asyncFunctionThatCouldFail, options);

    breaker.fallback(() => {
      rabbitMQMessagesToSendQueue.push({location, type: 'create'});
    });
    
    breaker.fire().catch((e) => {
      console.log('inside catch after .fire');
      console.log('e', e);
    });
  });
});



// UPDATE
router.put('/api/locations/:id', function (req, res, next) {
  // get the location by id
  
  // verify that there is at least 1 room and 1 mezzanineArea

  // validate that all room numbers within a location are unique
  const _id = req.params.id;

  
  // make sure we aren't deleting anything
  LocationModel.findById(_id, function (err, oldLocation) {
    if (err) {
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

      // remove from queue if we're updating, since newer should take precedent
      _.remove(rabbitMQMessagesToSendQueue, (queuedItem) => queuedItem.location._id === location._id);
      
      function asyncFunctionThatCouldFail() {
        return new Promise((resolve, reject) => {
          publishLocationModification(location, () => {
            res.json(location);
            resolve();
          }, (err) => {
            console.log('Experienced err trying to publish', err);
            res.json(location);
            reject();
          });
        });
      }

      const options = {
        timeout: 3000, // If our function takes longer than 3 seconds, trigger a failure
        errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
        resetTimeout: 15000 // After 15 seconds, try again.
      };

      const breaker = new CircuitBreaker(asyncFunctionThatCouldFail, options);

      breaker.fallback(() => {
        console.log('Adding ', location, 'to the queue to try later');
        rabbitMQMessagesToSendQueue.push({location, type: 'modify'});
      });
      
      breaker.fire().catch((e) => {
        console.log('inside catch after .fire');
        console.log('e', e);
      });
    });
  });
});





export default router
