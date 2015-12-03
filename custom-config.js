  module.exports = {
    mongo_url: process.env.MONGO_URL || 'mongodb://localhost:27017/gtfs',
    mongo_url_neptune: process.env.MONGO_URL || 'mongodb://localhost:27017/neptune',
    mongo_url_customneptune: process.env.MONGO_URL || 'mongodb://localhost:27017/CustomData',
    agencies: [
	//{short_name: 'tam_short', long_name: 'Transport Agglomération Montpellier', path: 'montpellier_short', parser: null},
//	{short_name: 'gtfs', long_name: 'Chouette Generate', path: 'chouettegtfs', parser:null}
	{short_name: 'neptune', long_name: 'Niort Test', path: 'neptunetest.xml', parser: null}
//	 {short_name: "tam", long_name: "Transport Agglomératon Montpellier", path: "montpellier_GTFS", parser: null},
//	{short_name:"Paris", long_name: "GTFS Parisien", path: "Paris", parser: null}
//	 {territory_key : "Languedoc-Roussillon", network_key: "septa", path: "septa_bus", parser: function(line, GTFSFile, cb){
        // cb(null, line);
	// }}
//	{territory_key : "Languedoc-Roussillon", network_key: "septa", path: "septa_bus", parser: null}
    ]
};
