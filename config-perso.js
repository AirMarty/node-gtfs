  module.exports = {
    mongo_url: process.env.MONGO_URL || 'mongodb://localhost:27017/gtfs',
    agencies: [
//	{network_key: 'tam_short', path: 'montpellier_short', parser: null}
	 {network_key: "montpellier_tam", path: "montpellier_GTFS", parser: null}
	// {territory_key : "Languedoc-Roussillon", network_key: "septa", path: "septa_bus", parser: function(line, GTFSFile, cb){
        // cb(null, line);
	// }}
	// {territory_key : "Languedoc-Roussillon", network_key: "septa", path: "septa_bus", parser: null}
    ]
};
