/**
 * Created by msa_m on 11/4/15.
 */
var mongoose = require('mongoose');
var utils = require('../lib/utils');

var CustomTrip = mongoose.model('CustomTrip', new mongoose.Schema({
    network_key: {
        type: String,
        index: true
    },
    route_id: {
        type: String,
        index: true
    },
    trip_id: String,
    trip_headsign: String,
    direction_id: {
        type: Number,
        index: true,
        min: 0,
        max: 1
    },
    shape_id: String,
    calendar: {
        service_id : String,
        monday: {
            type: Number,
            min: 0,
            max: 1
        },
        tuesday: {
            type: Number,
            min: 0,
            max: 1
        },
        wednesday: {
            type: Number,
            min: 0,
            max: 1
        },
        thursday: {
            type: Number,
            min: 0,
            max: 1
        },
        friday: {
            type: Number,
            min: 0,
            max: 1
        },
        saturday: {
            type: Number,
            min: 0,
            max: 1
        },
        sunday: {
            type: Number,
            min: 0,
            max: 1
        },
        start_date: Number,
        end_date: Number
    },
    stoptimes: [{
        arrival_time: {
            type: String,
            set: utils.secondsToTime,
            get: utils.timeToSeconds
        },
        departure_time: {
            type: String,
            index: true,
            set: utils.secondsToTime,
            get: utils.timeToSeconds
        },
        stop_id: String,
        stop_sequence: {
            type: Number,
            index: true
        },
        stop_headsign: String
        //stop: {
        //    stop_code: String,
        //    stop_name: String,
        //    stop_desc: String,
        //    stop_lat: Number,
        //    stop_lon: Number,
        //    location_type: {
        //        type: Number,
        //        min: 0,
        //        max: 1
        //    },
        //    parent_station: String,
        //    wheelchair_boarding: {
        //        type: Number,
        //        min: 0,
        //        max: 2
        //    }
        //}
    }]
}));
