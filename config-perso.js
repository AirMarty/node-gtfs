if (process.env.NODE_ENV === 'test'){
  module.exports = require('./test/config');
  return;
}

module.exports = {
  mongo_url: process.env.MONGO_URL || 'mongodb://localhost:27017/gtfs',
  agencies: [
    /*
     * You can specify agencies in the following ways:
     * * Put agency_key names from gtfs-data-exchange.com:
     * 'bay-area-rapid-transit'
     *
     * * Specify a download URL:
     * {agency_key: 'caltrain', url: 'http://www.gtfs-data-exchange.com/agency/caltrain/latest.zip'}
     *
     * * Specify a path to a zipped GTFS file:
     * {agency_key: 'localAgency', path: '/path/to/the/gtfs.zip'}
     *
     * * Specify a path to an unzipped GTFS file:
     * {agency_key: 'localAgency', path: '/path/to/the/unzipped/gtfs/'}
     *
     * Additionally, you can also specify a proj4 projection string to correct the bad formed coordinates:
     * {agency_key: 'lambertIIProjection', path: '/path/to/gtfs.zip', proj: '+proj=lcc +lat_1=46.8 +lat_0=46.8 +lon_0=0 +k_0=0.99987742 +x_0=600000 +y_0=2200000 +a=6378249.2 +b=6356515 +towgs84=-168,-60,320,0,0,0,0 +pm=paris +units=m +no_defs'}
     */

//       { agency_key: 'montpellier', path: './import/montpellier_gtfs.zip'}
//       { agency_key: 'paris', path: './import/Paris'}
//      { agency_key: 'montpellier_short', path: './import/montpellier_short'}
//       { agency_key: 'septa', path: './import/septa_bus' },
      // { agency_key: 'septa_NS', path: './import/septa_bus_no_shapes'}
      ]
};
