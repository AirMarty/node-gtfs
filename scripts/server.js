var http = require('http');
var async = require('async');
var gtfs = require('gtfs');
var url = require('url');
var events = require('events');
var mongoose = require('mongoose');
var request = require('request');
var polyline = require('polyline');
//var fs = require('fs');

//load config.js
var db = mongoose.connect('mongodb://localhost:27017/gtfs');

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

var getStopsFoShapes = function(network_key, cb) {
    
    var trip_ids;
    
    getYoyo(function(e, res){
	cb(e, res);
    });

    function getTrips(callback){
	Trip.find({
	    network_key: network_key
	}).exec(function(e, result){
	    console.log(result);
	    callback(e, result);
	});
    }

    function getStopLocations(trip_id, callback){
	var stop_ids;
	var loc_list = [];
	var i = 0;
	StopTime.find({
	    network_key: network_key,
	    trip_id: trip_id
	}).exec(function(e, result){
	    stop_ids = result.map(function(stoptime){
		return {
		    stop_id : stoptime.stop_id,
		    stop_sequence : stoptime.stop_sequence
		}
	    });
	    stop_ids.forEach(function(exemple, index){
		Stop.find({
		    network_key: network_key,
		    stop_id: exemple.stop_id
		}).exec(function(e, result){
		    // check les données entrées si il y a une erreur  sur result[0].loc
		    // if (!result[0])
		    // 	console.log("stop_id: " + exemple + " result: " + result[0] + " trip_id: " + trip_id);
		    loc_list.push({
			loc : result[0].loc,
			sequence : exemple.stop_sequence
		    });
		    if (i === stop_ids.length - 1)
		    {
			loc_list.sort(function(a, b){return a.sequence - b.sequence}); //order stops by sequence
			loc_list = loc_list.map(function(loc){return loc.loc}); // remove sequence from loc_list
			callback(e, loc_list);
		    }
		    else
			i++;
		});
	    })
	});
    }

    function buildUrl(stop_loc)
    {
	var query_url;

	query_url = "http://router.project-osrm.org/trip?"
	for (var i = 0; i < stop_loc.length; i++){
	    if (i === 0)
		query_url = query_url.concat('loc=', JSON.stringify(stop_loc[i][0]),
					     ',', JSON.stringify(stop_loc[i][1]));
	    else
		query_url = query_url.concat('&loc=', JSON.stringify(stop_loc[i][0]),
					     ',', JSON.stringify(stop_loc[i][1]));
	}
	return (query_url);
    }
    
    var _decode = function(encoded, precision) {
	precision = Math.pow(10, -precision);
	var len = encoded.length, index=0, lat=0, lng = 0, array = [];
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
	    array.push( [lat * precision, lng * precision] );
	}
	return array;
    }
    
    function getYoyo(callback)
    {
	var trip_ids;
	var stops_loc = [];
	var i = 0;
	getTrips(function(e, res){
	    trip_ids = res.map(function(trip){
		return {
		    trip_id : trip.trip_id,
		    shape_id : trip.shape_id
		}
	    })
	    var tab_compare = [];
	    trip_ids.forEach(function(exemple, index){
		var pass = false;
		getStopLocations(exemple.trip_id, function(e, res){
		    stops_loc.push(res);
		    var url = buildUrl(res);
		    request(url, function (error, response, body) {
			if (!error && response.statusCode == 200) {
			    var test = JSON.parse(body);
			    if (tab_compare.length === 0){
				tab_compare.push(test.trips[0].route_geometry);
				pass = true;
			    }
			    else{
				var v = 0;
				for (var x = 0; x < tab_compare.length; x++){
				    if (test.trips[0].route_geometry === tab_compare[x]) {
					v = 1;
				    }
				}
				if (v === 0){
				    pass = true;
				}
			    }
			    if (pass){
				test = _decode(test.trips[0].route_geometry, 6);
				for (var cmp = 0; cmp < test.length; cmp++){
				    if (!exemple.shape_id){
					shape = new Shape({
			    		    shape_id : exemple.trip_id + i,
					    shape_pt_lat : test[cmp][1],
					    shape_pt_lon : test[cmp][0],
					    shape_pt_sequence : cmp,
					    network_key: network_key});
					shape.save(function(err){
					    if(err) return handleError(err);
					})
					Trip.update({network_key : network_key, trip_id : exemple.trip_id},
						    { shape_id : shape.shape_id }, function(err, raw){
							if(err) return handleError(err);
							console.log(raw);
						    })
				    }
				    else{
					shape = new Shape({
			    		    shape_id : exemple.shape_id,
					    shape_pt_lat : test[cmp][1],
					    shape_pt_lon : test[cmp][0],
					    shape_pt_sequence : cmp,
					    network_key: network_key});
					shape.save(function(err){
					    if(err) return handleError(err);
					})
				    }
				}
			    }
			    if (i === trip_ids.length - 1)
			    {
				callback(e, stops_loc);
			    }
			    else
			    {
				i++;
			    }
			}
		    });
		})
	    })
	})
    }
}


var server = http.createServer(function(req, res) {

    var page = url.parse(req.url).pathname;
//    var eventEmitter = new events.EventEmitter();
    console.log(page);
    res.writeHead(200);
    if (page === '/yolo')
    {
	getStopsFoShapes('tam', function(err, stops_loc) {
	    res.end(JSON.stringify(stops_loc));
	});
    }
});
server.listen(8080);
