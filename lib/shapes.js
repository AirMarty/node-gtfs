/**
 * Created by msa_m on 11/3/15.
 */
var _ = require('underscore');
var async = require('async');
var mongoose = require('mongoose');
var request = require('request');

var config = require('../custom-config.js');
var db = mongoose.createConnection(config.mongo_url);

require('../models/Agency');
require('../models/Calendar');
require('../models/CalendarDate');
require('../models/FareAttribute');
require('../models/FareRule');
require('../models/FeedInfo');
require('../models/Frequencies');
require('../models/Route');
require('../models/RouteDirection');
require('../models/Shape');
require('../models/Stop');
require('../models/StopTime');
require('../models/Transfer');
require('../models/Trip');
require('../models/Timetable');
require('../models/CustomTrip');
require('../models/CustomShape');


var Agency = db.model('Agency');
var Calendar = db.model('Calendar');
var CalendarDate = db.model('CalendarDate');
var FeedInfo = db.model('FeedInfo');
var Route = db.model('Route');
var RouteDirection = db.model('RouteDirection');
var Shape = db.model('Shape');
var Stop = db.model('Stop');
var StopTime = db.model('StopTime');
var Trip = db.model('Trip');
var Timetable = db.model('Timetable');
var CustomTrip = db.model('CustomTrip');
var CustomShape = db.model('CustomShape');

module.exports = {
    createShapes: function (network_key, cb) {

        var index = 0;
        var cpt = 0;
      //  var x = 0;

        function buildUrl(stop_loc) {
            var query_url;

//            query_url = "http://router.project-osrm.org/trip?";
            query_url = "http://localhost:5000/trip?";
            for (var i = 0; i < stop_loc.length; i++) {
                if (i === 0)
                    query_url = query_url.concat('loc=', JSON.stringify(stop_loc[i].lon),
                        ',', JSON.stringify(stop_loc[i].lat));
                else
                    query_url = query_url.concat('&loc=', JSON.stringify(stop_loc[i].lon),
                        ',', JSON.stringify(stop_loc[i].lat));
            }
            return (query_url);
        }

        var _decode = function (encoded, precision) {
            precision = Math.pow(10, -precision);
            var len = encoded.length, index = 0, lat = 0, lng = 0, array = [];
            while (index < len) {
                var b, shift = 0, result = 0;
                do {
                    b = encoded.charCodeAt(index++) - 63;
                    result |= (b & 0x1f) << shift;
                    shift += 5;
                } while (b >= 0x20);
                var dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
                lat += dlat;
                shift = 0;
                result = 0;
                do {
                    b = encoded.charCodeAt(index++) - 63;
                    result |= (b & 0x1f) << shift;
                    shift += 5;
                } while (b >= 0x20);
                var dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
                lng += dlng;
                array.push([lat * precision, lng * precision]);
            }
            return array;
        };

        getCustomTrip(function(){
            cb(null,(1));
        });

        function getStop(stoptime, cb){
            Stop.findOne({network_key: network_key, stop_id: stoptime.stop_id}).exec(function(e, res){
               cb(null, {lat: res.stop_lat, lon: res.stop_lon});
            });
        }

        function getStops(resultCustomTrip , path, cb) {
            getStop(resultCustomTrip.stoptimes[cpt], function(e, res){
                path.push(res);
                if (cpt === (resultCustomTrip.stoptimes.length - 1)){
                    cb(null, path);
                }
                else{
                    cpt++;
                    getStops(resultCustomTrip, path, function(e, resp){
                       cb(null, resp);
                    });
                }
            });
        }

        function getCustomTrips(tripids, cb){
//            console.log('start');
            cpt = 0;
            var path = [];
            var tabcheck = [];
            CustomTrip.findOne({network_key: network_key, trip_id: tripids[index]}).exec(function(e, customTrip){
                getStops(customTrip, path, function (e, res) {
                    var url = buildUrl(res);
                    request(url, function (error, response, body) {
                        if (!error && response.statusCode == 200) {
                            var test = JSON.parse(body);
                            //if (tabcheck === null)
                            //    tabcheck.push(test.trips[0].route_geometry);
                            //else {
                            //    for(var i = 0; i < tabcheck.length; i++){
                            //        if (tabcheck[i] === test.trips[0].route_geometry){
                            //            index++;
                            //            getCustomTrips(tripids, function () {
                            //                cb();
                            //            });
                            //        }
                            //    }
                            //        tabcheck.push(test.trips[0].route_geometry);
                            //}

                                var t = process.hrtime();
                                test = _decode(test.trips[0].route_geometry, 6);
                                var cShape;
                                if (!customTrip.shape_id){
                                    cShape = new CustomShape({
                                        shape_id: customTrip.trip_id + index,
                                        network_key: network_key,
                                        loc: test
                                    });
                                    cShape.save(function(err){
                                        Trip.update({network_key: network_key, trip_id: customTrip.trip_id},
                                            {shape_id: cShape.shape_id}, function (err, raw) {
                                                if (err) return handleError(err);
                                                if (index === tripids.length - 1) {
                                                    console.log('request ended: ' + process.hrtime(t)[0] + 'length' + test.length);
                                                    cb();
                                                }
                                                else {
                                                    index++;
//                                                    console.log('end');
                                                    getCustomTrips(tripids, function () {
                                                        console.log('request ended: ' + process.hrtime(t)[0] + 'length' + test.length);
                                                        cb();
                                                    });
                                                }
                                            });
                                    });
                                }
                                else{
                                    //revoir les schémas de loc
                                    cShape = new CustomShape({
                                        shape_id: customTrip.shape_id,
                                        network_key: network_key,
                                        loc: test
                                    });
                                    cShape.save(function(err){
   //                                     console.log('save');
                                        if (err) return handleError(err);
                                        if (index === tripids.length - 1) {
                                            console.log('request ended: ' + process.hrtime(t)[0] + 'length' + test.length);
                                            cb();
                                        }
                                        else {
                                            index++;
 //                                           console.log('end');
                                            getCustomTrips(tripids, function () {
                                                console.log('request ended: ' + process.hrtime(t)[0] + 'length' + test.length);
                                                cb();
                                            });
                                        }
                                    });
                                }
                                //for (var cmp = 0; cmp < test.length; cmp++) {
                                //    var shape;
                                //    if (!customTrip.shape_id) {
                                //        shape = new Shape({
                                //            shape_id: customTrip.trip_id + index,
                                //            shape_pt_lat: test[cmp][1],
                                //            shape_pt_lon: test[cmp][0],
                                //            shape_pt_sequence: cmp,
                                //            network_key: network_key
                                //        });
                                //        if (cmp === test.length - 1) {
                                //            Trip.update({network_key: network_key, trip_id: customTrip.trip_id},
                                //                {shape_id: shape.shape_id}, function (err, raw) {
                                //                    if (err) return handleError(err);
                                //                });
                                //            shape.save(function (err) {
                                //                if (index === tripids.length - 1) {
                                //                    console.log('request ended: ' + process.hrtime(t)[0] + 'length' + test.length);
                                //                    cb();
                                //                }
                                //                else {
                                //                    index++;
                                //                    console.log('end');
                                //                    getCustomTrips(tripids, function () {
                                //                        console.log('request ended: ' + process.hrtime(t)[0] + 'length' + test.length);
                                //                        cb();
                                //                    });
                                //                }
                                //            });
                                //        }
                                //        else {
                                //            shape.save(function (err) {
                                //                if (err) {
                                //                    return handleError(err);
                                //                }
                                //            });
                                //        }
                                //    }
                                //    else {
                                //        shape = new Shape({
                                //            shape_id: customTrip.shape_id,
                                //            shape_pt_lat: test[cmp][1],
                                //            shape_pt_lon: test[cmp][0],
                                //            shape_pt_sequence: cmp,
                                //            network_key: network_key
                                //        });
                                //        if (cmp === test.length - 1) {
                                //            shape.save(function (err) {
                                //                if (index === tripids.length - 1) {
                                //                    console.log('request ended: ' + process.hrtime(t)[0]  + 'length' + test.length);
                                //                    cb();
                                //                }
                                //                else {
                                //                    index++;
                                //                    console.log('request ended: ' + process.hrtime(t)[0]  + 'length' + test.length);
                                //                    console.log('end');
                                //                    getCustomTrips(tripids, function () {
                                //                        cb();
                                //                    });
                                //                }
                                //                if (err) {
                                //                    return handleError(err);
                                //                }
                                //            });
                                //        }
                                //        else {
                                //            shape.save(function (err) {
                                //                if (err) {
                                //                    return handleError(err);
                                //                }
                                //            });
                                //        }
                                //    }
                                //    //           x++;
                                //}
                        }
                        else {
                            console.log('Error ORSM : ' + response.statusCode);
                            cb();
                        }
                    });
                });
            });
        }
        function getCustomTrip (cb){
            Trip.find({
                network_key : network_key
            }).exec(function(e, res){
                res = res.map(function(trips){
                    return (trips.trip_id);
                });
                getCustomTrips(res, function(){
                    cb();
                })
            })
        }
    },
    getShapesByNetwork: function (network_key, cb) {
        Shape.find({
            network_key: network_key
        }, cb);
    }
};
