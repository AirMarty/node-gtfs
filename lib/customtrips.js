/**
 * Created by msa_m on 11/4/15.
 */
var _ = require('underscore');
var async = require('async');
var mongoose = require('mongoose');
var request = require('request');


var config = require('../custom-config.js');
var db = mongoose.connect(config.mongo_url);

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

module.exports = {
    createCustomTrip: function(network_key, cb) {
        'use strict';
            CustomTrip.remove({
                network_key: network_key
            }, function() {
                var x = 0;
                var trips = [];
                var glo_index = 0;
                init_function(function () {
                    cb();
                });

                function getTrips(callback) {
                    console.log('getTrips');
                    Trip.find({
                        network_key: network_key
                    }).exec(function (e, result) {
                        callback(e, result);
                    });
                }

                function init_function(callb) {
                    getTrips(function (e, res) {
                        trips = res;
//                        console.log(trips.length);
                        getCalendar(function () {
                            callb();
                        });
                    });
                }

                function getCalendar(cb) {
                    var obj = {
                        network_key: network_key,
                        route_id: trips[x].route_id,
                        trip_id: trips[x].trip_id,
                        trip_headsign: trips[x].trip_headsign,
                        direction_id: trips[x].direction_id,
                        stoptimes: []
                    };
                    if (trips[x].shape_id !== null) {
                        obj.shape_id = trips[x].shape_id;
                    }
                    Calendar.find({
                        network_key: network_key,
                        service_id: obj.service_id
                    }).exec(function (e, resultCalendar) {
                        obj.calendar = resultCalendar;
                        getStopTimes(obj, function () {
                            cb();
                        });
                    });
                }

                function getStop(resultStopTime, cb) {
                    Stop.findOne({
                        network_key: network_key,
                        stop_id: resultStopTime[glo_index].stop_id
                    }).exec(function (e, resultStop) {
                        var mystoptime = {
                            arrival_time: resultStopTime[glo_index].arrival_time,
                            departure_time: resultStopTime[glo_index].departure_time,
                            stop_id: resultStopTime[glo_index].stop_id,
                            stop_sequence: resultStopTime[glo_index].stop_sequence,
                            stop_headsign: resultStopTime[glo_index].stop_headsign,

                            stop: {
                                stop_code: resultStop.stop_code,
                                stop_name: resultStop.stop_name,
                                stop_desc: resultStop.stop_desc,
                                stop_lat: resultStop.stop_lat,
                                stop_lon: resultStop.stop_lon,
                                location_type: resultStop.location_type,
                                parent_station: resultStop.parent_station,
                                wheelchair_boarding: resultStop.wheelchair_boarding
                            }
                        };
                        cb(null, mystoptime);
                    });
                }

                function getStops(resultStopTime, obj, cb) {
//            console.log(obj);
                    getStop(resultStopTime, function (e, res) {
//                console.log(res);
                        obj.stoptimes.push(res);
                        if (glo_index === (resultStopTime.length - 1)) {
                            cb(null, obj);
                        }
                        else {
                            glo_index++;
                            getStops(resultStopTime, obj, function (e, res) {
                                cb(null, obj);
                            })
                        }
                    });
                }

                function getStopTimes(obj, cb) {
                    StopTime.find({
                        network_key: network_key,
                        trip_id: obj.trip_id
                    }).exec(function (e, resultStopTime) {
                        //glo_index = 0;
                        for (var i = 0; i < resultStopTime.length; i++) {
                            obj.stoptimes.push({
                                arrival_time: resultStopTime[i].arrival_time,
                                departure_time: resultStopTime[i].departure_time,
                                stop_id: resultStopTime[i].stop_id,
                                stop_sequence: resultStopTime[i].stop_sequence,
                                stop_headsign: resultStopTime[i].stop_headsign,
                            });
                        }
                        //getStops(resultStopTime, obj,function(e, res){
                        //    obj = res;
                        var customTrip = new CustomTrip(obj);
                        customTrip.save(function (err) {
                            if (err) return handleError(err);
                            if (x === (trips.length - 1)) {
                                cb();
                            }
                            else {
                                x++;
                                getCalendar(function () {
                                    setTimeout(function () {
                                        cb();
                                    }, 0);
                                });
                            }
                        });
//                });
                    });
                }
            });
    }
//    upStopsInCustomTrip: function(network_key, cb) {
//        var cpt = 0;
//        function getStop(stoptimes, cb){
//            Stop.findOne({
//                network_key: network_key,
//                stop_id: stoptimes[cpt].stop_id
//            }).exec(function (e, resultStop) {
//                var mystop = {
//                    stop_code: resultStop.stop_code,
//                    stop_name: resultStop.stop_name,
//                    stop_desc: resultStop.stop_desc,
//                    stop_lat: resultStop.stop_lat,
//                    stop_lon: resultStop.stop_lon,
//                    loc: resultStop.loc,
//                    location_type: resultStop.location_type,
//                    parent_station: resultStop.parent_station,
//                    wheelchair_boarding: resultStop.wheelchair_boarding
//                };
//                cb(null, mystop);
//            });
//        }
//
//        function getStops(resultCustomTrip ,cb){
//            getStop(resultCustomTrip.stoptimes, function(e, res){
//                resultCustomTrip.stoptimes[cpt].stop = res;
//                if (cpt === (resultCustomTrip.stoptimes.length - 1)){
//                    cb(null, resultCustomTrip);
//                }
//                else{
//                    cpt++;
//                    getStops(resultCustomTrip, function(e, res){
//                        resultCustomTrip = res;
//                       cb(null, resultCustomTrip);
//                    });
//                }
//            });
//        }
//        function getTrip(resultCustomTrip, cb){
//            cpt = 0;
//            getStops(resultCustomTrip[glo_tripid], function(e, res){
////                console.log(resultCustomTrip.length);
////                console.log(res);
//                CustomTrip.update({network_key: network_key, trip_id : resultCustomTrip[glo_tripid].trip_id},
//                    {$set: {stoptimes: res.stoptimes}}, function (err, resp) {
//                        if (err) return handleError(err);
//                        if (glo_tripid === (resultCustomTrip.length - 1)){
//                            cb()
//                        }
//                        else{
//                            glo_tripid++;
//                            if (glo_tripid % 100 === 0)
//                            console.log('trip: ' + glo_tripid);
//                            getTrip(resultCustomTrip, function(){
//                                cb();
//                            });
//                        }
//                    });
//            });
//        }
//
//        var glo_tripid = 0;
//        CustomTrip.find({
//            network_key: network_key
//        }).exec(function(e, resultCustomTrip) {
//            getTrip(resultCustomTrip, function(){
//                cb();
//            });
//        });
//    }
};