var async = require('async');
var exec = require('child_process').exec;
var csv = require('csv');
var fs = require('fs');
var MongoClient = require('mongodb').MongoClient;
var path = require('path');
var proj4 = require('proj4');
var request = require('request');
var unzip = require('unzip2');
var up = require('../lib/customtrips');
var gtfs = require('../lib/shapes');
var readline = require('readline');
var q;


// check if this file was invoked direct through command line or required as an export
var invocation = (require.main === module) ? 'direct' : 'required';
var config = {};
if(invocation === 'direct') {
    // var data = fs.readFileSync('./config.json');
    // config = JSON.parse(data);
  var config = require('../custom-config.js');


    if(!config.agencies) {
    handleError(new Error('No network_key specified in config.js\nTry adding \'capital-metro\' to ' +
        'the agencies in config.js to load transit data'));
    process.exit();
  }
}

var GTFSFiles = [{
  fileNameBase: 'agency',
  collection: 'agencies',
  parseur: null
}, {
  fileNameBase: 'calendar_dates',
  collection: 'calendardates',
  parseur: function(line, cb) {
    if (line.date) {
      line.date = parseInt(line.date, 10);
    }
    if (line.exception_type) {
      line.exception_type = parseInt(line.exception_type, 10);
    }
    cb(null, line);
  }
}, {
  fileNameBase: 'calendar',
  collection: 'calendars',
  parseur: function(line, cb){
    if (line.monday) {
      line.monday = parseInt(line.monday, 10);
    }
    if (line.tuesday) {
      line.tuesday = parseInt(line.tuesday, 10);
    }
    if (line.wednesday) {
      line.wednesday = parseInt(line.wednesday, 10);
    }
    if (line.thursday) {
      line.thursday = parseInt(line.thursday, 10);
    }
    if (line.friday) {
      line.friday = parseInt(line.friday, 10);
    }
    if (line.saturday) {
      line.satuday = parseInt(line.saturday, 10);
    }
    if (line.sunday) {
      line.sunday = parseInt(line.sunday, 10);
    }
    if (line.start_date) {
      line.start_date = parseInt(line.start_date, 10);
    }
    if (line.end_date) {
      line.end_date = parseInt(line.end_date, 10);
    }
    cb(null, line);
  }
}, {
  fileNameBase: 'fare_attributes',
  collection: 'fareattributes',
  parseur: null
}, {
  fileNameBase: 'fare_rules',
  collection: 'farerules',
  parseur:null
}, {
  fileNameBase: 'feed_info',
  collection: 'feedinfos',
  parseur: null
}, {
  fileNameBase: 'frequencies',
  collection: 'frequencies',
  parseur: null
}, {
  fileNameBase: 'routes',
  collection: 'routes',
  parseur: null
}, {
  fileNameBase: 'shapes',
  collection: 'shapes',
  parseur: function(line, cb){
    if (line.shape_pt_sequence) {
      line.shape_pt_sequence = parseInt(line.shape_pt_sequence, 10);
    }
    //make lat/long for shapes
    if(line.shape_pt_lat && line.shape_pt_lon) {
      line.shape_pt_lon = parseFloat(line.shape_pt_lon);
      line.shape_pt_lat = parseFloat(line.shape_pt_lat);
      line.loc = [line.shape_pt_lon, line.shape_pt_lat];
    }
    cb(null, line);
  }
}, {
  fileNameBase: 'stop_times',
  collection: 'stoptimes',
  parseur: function(line, cb){
    if (line.stop_sequence) {
      line.stop_sequence = parseInt(line.stop_sequence, 10);
    }
    cb(null, line);
  }
}, {
  fileNameBase: 'stops',
  collection: 'stops',
  parseur: function(line, task, agency_bounds, cb){
    if(line.stop_lat && line.stop_lon) {
      line.loc = [
        parseFloat(line.stop_lon),
        parseFloat(line.stop_lat)
      ];

      // if coordinates are not specified, use [0,0]
      if (isNaN(line.loc[0])) {
        line.loc[0] = 0;
      }
      if (isNaN(line.loc[1])) {
        line.loc[1] = 0;
      }

      // Convert to epsg4326 if needed
      if (task.agency_proj) {
        line.loc = proj4(task.agency_proj, 'WGS84', line.loc);
        line.stop_lon = line.loc[0];
        line.stop_lat = line.loc[1];
      }
      //???
      // Calulate agency bounds
      if(agency_bounds.sw[0] > line.loc[0] || !agency_bounds.sw[0]) {
        agency_bounds.sw[0] = line.loc[0];
      }
      if(agency_bounds.ne[0] < line.loc[0] || !agency_bounds.ne[0]) {
        agency_bounds.ne[0] = line.loc[0];
      }
      if(agency_bounds.sw[1] > line.loc[1] || !agency_bounds.sw[1]) {
        agency_bounds.sw[1] = line.loc[1];
      }
      if(agency_bounds.ne[1] < line.loc[1] || !agency_bounds.ne[1]) {
        agency_bounds.ne[1] = line.loc[1];
      }
    }
    cb(null, {line: line, agency: agency_bounds});
  }
}, {
  fileNameBase: 'transfers',
  collection: 'transfers',
  parseur: null
}, {
  fileNameBase: 'trips',
  collection: 'trips',
  parseur: function(line, cb){
    if (line.direction_id) {
      line.direction_id = parseInt(line.direction_id, 10);
    }
    cb(null, line);
  }
}, {
  fileNameBase: 'timetables',
  collection: 'timetables',
  parseur: function(line, cb){
    if (line.direction_id) {
      line.direction_id = parseInt(line.direction_id, 10);
    }
    cb(null, line);
  }
}, {
  fileNameBase: 'route_directions',
  collection: 'routedirections',
  parseur: function(line, cb){
    if (line.direction_id) {
      line.direction_id = parseInt(line.direction_id, 10);
    }
    cb(null, line);
  }
}];


function main(config, callback) {

  var log = (config.verbose === false) ? function () {} : console.log;

  // open database and create queue for agency list
  MongoClient.connect(config.mongo_url, {
    w: 1
  }, function (e, db) {
    if(e) handleError(e);

    //function checkDatabase

    q = async.queue(checkDatabase, 1);
    // loop through all agencies specified
    // If the network_key is a URL, download that GTFS file, otherwise treat
    // it as an network_key and get file from gtfs-data-exchange.com
    config.agencies.forEach(function (item) {
      var agency = {};

      if(typeof (item) == 'string') {
        agency.network_key = item;
        agency.agency_url = 'http://www.gtfs-data-exchange.com/agency/' + item + '/latest.zip';
      } else if(item.url) {
        agency.network_key = item.short_name + ' - ' + item.long_name;
        agency.agency_url = item.url;
      } else if(item.path) {
        agency.network_key = item.short_name + ' - ' + item.long_name;
        agency.path = './import/' + item.path; // import devient le dossier par default
        agency.parser = item.parser;
      }

      if(!agency.network_key) {
        handleError(new Error('No URL or Agency Key or path provided.'));
      }
      q.push(agency);
    });

    q.drain = function (e) {
      if(e) handleError(e);

      log('All agencies completed (' + config.agencies.length + ' total)');
      callback();
    };


    function checkDatabase(task, cb){
      var mongoose = require('mongoose');
      var db = mongoose.createConnection(config.mongo_url);
      var Agency = db.model('Agency');
      var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false});

      Agency.find({
        network_key : task.network_key
      }).exec(function(e, res){
        if (res && res != ''){
          console.error("The network_key " + task.network_key + "already exists.");
          rl.question("Overwrite? [yes]/no: ", function(answer){
            if (answer === 'no'){
              console.log ("Not overwritting " + task.network_key);
              cb();
            }
            else{
              console.log ("Overwriting " + task.network_key);
              downloadGTFS(task, function(){
                cb();
              });
            }
          });
        }
        else {
          downloadGTFS(task, function() {
            cb();
          });
        }
      });
    }

    function downloadGTFS(task, cb) {
      var downloadDir = 'downloads';
      var gtfsDir = 'downloads';
      var network_key = task.network_key;
      var parse_func = task.parser;
      var agency_bounds = {
        sw: [],
        ne: []
      };
      var init_time = process.hrtime();

      log(network_key + ': Starting');

      async.series([
        cleanupFiles,
        getFiles,
        removeDatabase,
        importFiles,
        postProcess,
        cleanupFiles
      ], function (e, results) {
        log(e || network_key + ': Completed it takes : '
            + msToTime(process.hrtime(init_time)[0] * 1000));
        cb();
      });


      function cleanupFiles(cb) {
        //remove old downloaded file
        exec((process.platform.match(/^win/) ? 'rmdir /Q /S ' : 'rm -rf ') + downloadDir, function (e) {
          try {
            //create downloads directory
            fs.mkdirSync(downloadDir);
            cb();
          } catch(e) {
            if(e.code == 'EEXIST') {
              cb();
            } else {
              handleError(e);
            }
          }
        });
      }


      function getFiles(cb) {
        if(task.agency_url) {
          downloadFiles(cb);
        } else if(task.path) {
          readFiles(cb);
        }
      }


      function downloadFiles(cb) {
        // do download
        var file_protocol = require('url').parse(task.agency_url).protocol;
        if(file_protocol === 'http:' || file_protocol === 'https:') {
          log(network_key + ': Downloading');
          request(task.agency_url, processFile).pipe(fs.createWriteStream(downloadDir + '/latest.zip'));

          function processFile(e, response, body) {
            if(response && response.statusCode != 200) {
              cb(new Error('Couldn\'t download files'));
            }
            log(network_key + ': Download successful');

            fs.createReadStream(downloadDir + '/latest.zip')
              .pipe(unzip.Extract({
                path: downloadDir
              }).on('close', cb))
              .on('error', function (e) {
                log(network_key + ': Error Unzipping File');
                handleError(e);
              });
          }
        } else {
          if(!fs.existsSync(task.agency_url)) {
            return cb(new Error('File does not exists'));
          }

          fs.createReadStream(task.agency_url)
            .pipe(fs.createWriteStream(downloadDir + '/latest.zip'))
            .on('close', function () {
              fs.createReadStream(downloadDir + '/latest.zip')
                .pipe(unzip.Extract({
                  path: downloadDir
                }).on('close', cb))
                .on('error', handleError);
            })
            .on('error', handleError);
        }
      }


      function readFiles(cb) {
        if(path.extname(task.path) === '.zip') {
          // local file is zipped
          fs.createReadStream(task.path)
            .pipe(unzip.Extract({
              path: downloadDir
            }).on('close', cb))
            .on('error', handleError);
        } else {
          // local file is unzipped, just read it from there.
          gtfsDir = task.path;
          cb();
        }
      }

      function removeDatabase(cb) {
        //remove old db records based on network_key
        async.forEach(GTFSFiles, function (GTFSFile, cb) {
          db.collection(GTFSFile.collection, function (e, collection) {
            collection.remove({
              network_key: network_key
            }, cb);
          });
        }, function (e) {
          cb(e, 'remove');
        });
      }


      function importFiles(cb) {
        //Loop through each file and add network_key
        async.forEachSeries(GTFSFiles, function (GTFSFile, cb) {
          var filepath = path.join(gtfsDir, GTFSFile.fileNameBase + '.txt');
	    var cpt_line = 0;
          var mid_time_start = process.hrtime();
          if(!fs.existsSync(filepath)) {
            log(network_key + ': Importing data - No ' + GTFSFile.fileNameBase + ' file found');
            return cb();
          }
          log(network_key + ': Importing data - ' + GTFSFile.fileNameBase);
          db.collection(GTFSFile.collection, function (e, collection) {
            var input = fs.createReadStream(filepath);
            var parser = csv.parse({
              columns: true,
              relax: true
            });
            parser.on('readable', function () {
              while(line = parser.read()) {
                //remove null values
                for(var key in line) {
                  if(line[key] === null) {
                    delete line[key];
                  }
                }
                cpt_line++;
                //add network_key
                line.network_key = network_key;
                if (parse_func !== null) {
                  parse_func(line, GTFSFile, function(e, res){
                    line = res;
                  });
                }
                if (GTFSFile.parseur !== null){
                  if (GTFSFile.collection !== 'stops') {
                    GTFSFile.parseur(line, function (e, res) {
                      line = res
                    });
                  }
                  else{
                    GTFSFile.parseur(line, task, agency_bounds, function(e, res){
                      line = res.line;
                      agency_bounds = res.agency;
                    });
                  }
                }
                //insert into db
                collection.insert(line, function (e, inserted) {
                  if(e) handleError(e);
                });
              }
            });
            parser.on('end', function (count) {
              var mid_time_end = process.hrtime();
              var mid_dif = mid_time_end[0] - mid_time_start[0];
              mid_dif = msToTime(mid_dif * 1000);
              console.log('--> ' +  GTFSFile.fileNameBase + ': ' + cpt_line + ' and it takes: '
                  + msToTime(process.hrtime(mid_time_start)[0] * 1000));
              cb();
            });
            parser.on('error', handleError);
            input.pipe(parser);
          });
        }, function (e) {
          cb(e, 'import');
        });
      }

	function msToTime(duration) {
	    var seconds = parseInt((duration / 1000) % 60);
	    var minutes = parseInt((duration / (1000 * 60)) % 60);
	    var heures = parseInt((duration / (1000 * 60 * 60)) % 24);
	    
	    seconds = (seconds < 10) ? "0" + seconds : seconds;
	    minutes = (minutes < 10) ? "0" + minutes : minutes;
	    heures = (heures < 10) ? "0" + heures : heures;

	    return (heures + ':' + minutes + ':' + seconds);
	}

	function postProcess(cb) {
        log(network_key + ': Post Processing data');

        async.series([
          agencyCenter,
          updatedDate,
          upCustomTrips,
          createShapes
        ], function (e, results) {
          cb();
        });
      }


      function agencyCenter(cb) {
        var lat = (agency_bounds.ne[0] - agency_bounds.sw[0]) / 2 + agency_bounds.sw[0];
        var lon = (agency_bounds.ne[1] - agency_bounds.sw[1]) / 2 + agency_bounds.sw[1];
        var agency_center = [lat, lon];

        db.collection('agencies')
          .update({
            network_key: network_key
          }, {
            $set: {
              agency_bounds: agency_bounds,
              agency_center: agency_center
            }
          }, cb);
      }


      function updatedDate(cb) {
        db.collection('agencies')
          .update({
            network_key: network_key
          }, {
            $set: {
              date_last_updated: Date.now()
            }
          }, cb);
      }

      function upCustomTrips(cb){
        var mid_time_start = process.hrtime();
        up.createCustomTrip(network_key, function(e, res){
          console.log('--> CustomTrips: ' + res + ' and it takes: '
              + msToTime(process.hrtime(mid_time_start)[0] * 1000));
          if(e) return handleError(e);
          cb();
        })
      }

      function createShapes(cb) {
        //if there is no shapes
        var mid_time_start = process.hrtime();
        gtfs.getShapesByNetwork(network_key, function (e, res) {
          if (res.length === 0){
            console.log("There is no shapes, createShapes");
            gtfs.createShapes(network_key, function(e, res){
              console.log('--> Shapes: ' + res + ' and it takes: '
                  + msToTime(process.hrtime(mid_time_start)[0] * 1000));
              if(e) return handleError(e);
              cb();
            })
          }
          else{
            cb();
          }
        });
      }
    }
  });
}

function handleError(e) {
  console.error(e || 'Unknown Error');
  process.exit(1);
}

// Allow script to be called directly from commandline or required (for testable code)
if(invocation === 'direct') {
  main(config, function () {
    process.exit();
  });
} else {
  module.exports = main;
}
