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
    createShapes: function (network_key, cb) {

        var index = 0;
        var cpt = 0;

            function buildUrl(stop_loc) {
                var query_url;

                query_url = "http://router.project-osrm.org/trip?";
                for (var i = 0; i < stop_loc.length; i++) {
                    if (i === 0)
                        query_url = query_url.concat('loc=', JSON.stringify(stop_loc[i].lon),
                            ',', JSON.stringify(stop_loc[i].lat));
                    else
                        query_url = query_url.concat('&loc=', JSON.stringify(stop_loc[i].lon),
                            ',', JSON.stringify(stop_loc[i].lat));
                }
                console.log('buildUrl: ' + query_url);
                return (query_url);
            }

            var _decode = function (encoded, precision) {
                console.log('decode');
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
           cb();
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

        function getCustomTrips(customTrip, cb){
            cpt = 0;
            var path = [];
            var tabcheck = [];
            var pass = true;
            getStops(customTrip[index], path, function(e, res){
  //              console.log(res);
                var url = buildUrl(res);
                request(url, function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                        var test = JSON.parse(body);
                        if (tabcheck === null)
                            tabcheck.push(test.trips[0].route_geometry);
                        else {
                            for(var i = 0; i < tabcheck.length; i++){
                                if (tabcheck[i] === test.trips[0].route_geometry){
                                    pass = false;
                                }
                            }
                            if (pass)
                                tabcheck.push(test.trips[0].route_geometry);
                        }
                        if (pass) {
                            test = _decode(test.trips[0].route_geometry, 6);
                            for (var cmp = 0; cmp < test.length; cmp++) {
                                var shape;
                                if (!customTrip[index].shape_id) {
//                                    console.log('if il n\'y a pas de shapes_id dans trip');
                                    shape = new Shape({
                                        shape_id: customTrip[index].trip_id + index,
                                        shape_pt_lat: test[cmp][1],
                                        shape_pt_lon: test[cmp][0],
                                        shape_pt_sequence: cmp,
                                        network_key: network_key
                                    });
                                    if (cmp === test.length - 1) {
                                        Trip.update({network_key: network_key, trip_id: customTrip[index].trip_id},
                                            {shape_id: shape.shape_id}, function (err, raw) {
                                                console.log('update trip');
                                                if (err) return handleError(err);
                                            });
                                        shape.save(function (err) {
                                            if (index === customTrip.length - 1) {
                                                console.log(customTrip[index].trip_id + index);
                                                console.log('end');
                                                cb();
                                            }
                                            else {
                                                console.log(customTrip[index].trip_id + index);
                                                index++;
                                                getCustomTrips(customTrip, function () {
                                                    cb();
                                                });
                                            }
                                        });
                                    }
                                    else {
                                        shape.save(function (err) {
                                            if (err) {
                                                console.log("error save");
                                                return handleError(err);
                                            }
                                        });
                                    }
                                }
                                else {
                                    shape = new Shape({
                                        shape_id: customTrip[index].shape_id,
                                        shape_pt_lat: test[cmp][1],
                                        shape_pt_lon: test[cmp][0],
                                        shape_pt_sequence: cmp,
                                        network_key: network_key
                                    });
                                    if (cmp === test.length - 1) {
                                        shape.save(function (err) {
                                            if (index === customTrip.length - 1) {
                                                console.log('end');
                                                cb();
                                            }
                                            else {
                                                console.log(customTrip[index].shape_id);
                                                index++;
                                                getCustomTrips(customTrip, function () {
                                                    cb();
                                                });
                                            }
                                            if (err) {
                                                console.log("error save");
                                                return handleError(err);
                                            }
                                        });
                                    }
                                    else {
                                        shape.save(function (err) {
                                            if (err) {
                                                console.log("error save");
                                                return handleError(err);
                                            }
                                        });
                                    }
                                }
                            }
                        }
                    }
                    else{
                        console.log('Error ORSM : ' + response.statusCode);
                        cb();
                    }

               });
            });
        }
        function getCustomTrip (cb){
            CustomTrip.find({
                network_key : network_key
            }).exec(function(e, res){
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
