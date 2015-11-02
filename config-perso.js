  module.exports = {
    mongo_url: process.env.MONGO_URL || 'mongodb://localhost:27017/gtfs',
    agencies: [
//	{agency_key: 'tam', path: './import/montpellier_short'}
	{territory_key : "Languedoc-Roussillon", network_key: "tam", path: "montpellier_GTFS", parser: function(line, GTFSFile, cb){
        cb(null, line);
	}}
    ]
};
