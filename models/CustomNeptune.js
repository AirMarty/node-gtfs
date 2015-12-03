/**
 * Created by msa_m on 12/1/15.
 */
var mongoose = require('mongoose');

var CustomLineXML = mongoose.model('CustomLineXML', new mongoose.Schema({
    network_key: {
        type: String,
        index: true
    },
    agency_name: {
        type: String
    },
    line_id: {
        type: String,
        index: true
    },
    line_name: {
        type: String
    },
    route_id: {
        type: String,
        index: true
    },
    direction: {
        type: String,
        index: true
    },
    publishedJourneyName:{
        type: String,
        index: true
    },
    publishedJourneyIdentifier:{
        type: String,
        index : true
    },
    trip : [],
    Calendar : []
}));