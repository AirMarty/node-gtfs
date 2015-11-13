/**
 * Created by msa_m on 11/10/15.
 */
var mongoose = require('mongoose');

var CustomShape = mongoose.model('CustomShape', new mongoose.Schema({
  network_key: {
    type: String,
    index: true
  },
  shape_id: {
    type: String,
    index: true
  },
  loc: []
}));
