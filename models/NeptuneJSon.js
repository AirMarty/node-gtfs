/**
 * Created by msa_m on 12/2/15.
 */
var mongoose = require('mongoose');

var NeptuneJSon = mongoose.model('NeptuneJSon', new mongoose.Schema({
    ChouettePTNetwork: {
        info: {},
        PTNetwork:[{
            objectId : [{
                type : String,
                index : true
            }],
            versionDate : [{
                type : String,
                index : true
            }],
            name : [{
                type : String,
                index : true
            }],
            lineId : [{
                type : String,
                index : true
            }]
        }],
        Company:[{
            objectId : [],
            name : [],
            shortName : [],
            organisationalUnit : [],
            operatingDepartmentName : [],
            code : [],
            phone : [],
            fax : [],
            email: []
        }],
        ChouetteArea:[{
            StopArea : [],
            AreaCentroid : []
        }],
        Timetable:[],
        ChouetteLineDescription:[{
            Line : [],
            ChouetteRoute : [],
            StopPoint : [],
            PtLink : [],
            JourneyPattern : [],
            VehicleJourney : []
        }]
    }
}));