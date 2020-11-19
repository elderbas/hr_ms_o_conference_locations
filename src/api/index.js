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



//  _____       _     _     _ _     __  __  ____    ______    _ _ _                _       ____                        
// |  __ \     | |   | |   (_) |   |  \/  |/ __ \  |  ____|  | | | |              | |     / __ \                       
// | |__) |__ _| |__ | |__  _| |_  | \  / | |  | | | |__ __ _| | | |__   __ _  ___| | __ | |  | |_   _  ___ _   _  ___ 
// |  _  // _` | '_ \| '_ \| | __| | |\/| | |  | | |  __/ _` | | | '_ \ / _` |/ __| |/ / | |  | | | | |/ _ \ | | |/ _ \
// | | \ \ (_| | |_) | |_) | | |_  | |  | | |__| | | | | (_| | | | |_) | (_| | (__|   <  | |__| | |_| |  __/ |_| |  __/
// |_|  \_\__,_|_.__/|_.__/|_|\__| |_|  |_|\___\_\ |_|  \__,_|_|_|_.__/ \__,_|\___|_|\_\  \___\_\\__,_|\___|\__,_|\___|
                                                                                                                     
                                                                                                                    

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


//      _______ ______ _______ 
//     / / ____|  ____|__   __|
//    / / |  __| |__     | |   
//   / /| | |_ |  __|    | |   
//  / / | |__| | |____   | |   
// /_/   \_____|______|  |_|   

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



//      _______   ____   _____ _______   _   _____  _    _ _______ 
//     / /  __ \ / __ \ / ____|__   __| | | |  __ \| |  | |__   __|
//    / /| |__) | |  | | (___    | |    | | | |__) | |  | |  | |   
//   / / |  ___/| |  | |\___ \   | |    | | |  ___/| |  | |  | |   
//  / /  | |    | |__| |____) |  | |    | | | |    | |__| |  | |   
// /_/   |_|     \____/|_____/   |_|    | | |_|     \____/   |_|   
//                                      | |                        
//                                      |_|                        

// used by post and put to _attempt_ to publish to rabbitMQ, and will be circuit broke if it _fails_
function asyncFunctionThatCouldFail(location, res, publishFnToUse) {
  return new Promise((resolve, reject) => {
    publishFnToUse(location, () => {
      res.json(location);
      resolve();
    }, (err) => {
      reject(err);
      // use for playng around w how opossum handles waits etc,
      // if (_.random(0, 1) === 1) {
      //   setTimeout(() => {
      //     reject(err);
      //   }, 4000);
      // } else {
      //   reject(err);
      // }
    });
  });
}

const breaker = new CircuitBreaker(asyncFunctionThatCouldFail, {
  timeout: 3000, // If our function takes longer than 3 seconds, trigger a failure
  errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
  resetTimeout: 15000 // After 15 seconds, go to half open state
});

breaker.on('open', () => {
  console.log('\n---------');
  console.log('.on OPEN ');
  console.log('--------------');
});
breaker.on('close', () => {
  console.log('\n---------');
  console.log('.on CLOSE ');
  console.log('--------------');
});
breaker.on('halfOpen', () => {
  console.log('\n---------');
  console.log('.on HALFOPEN ');
  console.log('--------------');
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

    breaker
      .fire(location, res, publishLocationCreation)
      .catch((e) => {
        rabbitMQMessagesToSendQueue.push({location, type: 'create'});
        // let's send the location, with the optimism (perhaps misplaced)
        // that the location will be sent to rabbitMQ later
        res.send(location);
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

      // remove from fallback rabbitmq queue if we're updating, since newer location shape should take precedence
      _.remove(rabbitMQMessagesToSendQueue, (queuedItem) => queuedItem.location._id === location._id);
      
      breaker.on('fallback', () => {
        console.log('triggering fallback inside /put');
      });
      
      breaker
        .fire(location, res, publishLocationModification)
        .catch((e) => {
          rabbitMQMessagesToSendQueue.push({location, type: 'modify'});
          res.send(location);
        });
    });
  });
});



export default router
