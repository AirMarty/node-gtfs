/**
 * Created by msa_m on 11/4/15.
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
//                var glo_index = 0;
                init_function(function () {
                    cb(null, (x + 1));
                });

                function getTrips(callback) {
                    Trip.find({
                        network_key: network_key
                    }).exec(function (e, result) {
                        callback(e, result);
                    });
                }

                function init_function(callb) {
                    console.log(network_key + ': Importing data - customTrips');
                    getTrips(function (e, res) {
                        trips = res;
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
                    Calendar.findOne({
                        network_key: network_key,
                        service_id: trips[x].service_id
                    }).exec(function (e, resultCalendar) {
                        obj.calendar = resultCalendar;
                        //CalendarDate.find({
                        //    network_key: network_key,
                        //    service_id: trips[x].service_id
                        //}).exec(function(e, resultCalendarDate){
                        //    if (resultCalendarDate === null){
                        //        obj.date = null
                        //    }
                        //    else {
                        //        obj.date = resultCalendarDate;
                        //    }
                            getStopTimes(obj, function () {
                                cb();
                            });
                        //});
                    });
                }
                function getStopTimes(obj, cb) {
                    StopTime.find({
                        network_key: network_key,
                        trip_id: obj.trip_id
                    }).exec(function (e, resultStopTime) {
                        resultStopTime.sort(function(a, b){
                            if (a.stop_sequence > b.stop_sequence) {
                                return 1;
                            }
                            if (a.stop_sequence < b.stop_sequence) {
                                return -1;
                            }
                            return 0;
                        });
                        for (var i = 0; i < resultStopTime.length; i++) {
                            obj.stoptimes.push({
                                arrival_time: resultStopTime[i].arrival_time,
                                departure_time: resultStopTime[i].departure_time,
                                stop_id: resultStopTime[i].stop_id,
                                stop_headsign: resultStopTime[i].stop_headsign
                            });
                        }
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
                    });
                }
            });
    }
};