  module.exports = {
    mongo_url: process.env.MONGO_URL || 'mongodb://localhost:27017/gtfs',
    agencies: [
//	{short_name: 'tam_short', long_name: 'Transport Agglomération Montpellier', path: 'montpellier_short', parser: null}
	 {short_name: "tam", long_name: "Transport Agglomératon Montpellier", path: "montpellier_GTFS", parser: null}
	// {territory_key : "Languedoc-Roussillon", network_key: "septa", path: "septa_bus", parser: function(line, GTFSFile, cb){
        // cb(null, line);
	// }}
//	{territory_key : "Languedoc-Roussillon", network_key: "septa", path: "septa_bus", parser: null}
    ]
};
