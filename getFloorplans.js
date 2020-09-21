/**
 * This script will be used to collect and push the floorplan images for 
 * racetrac surveys.
 * Process:
 *  1. Gather record id and model_id via QB api call.
 *  2. Use model_id to gather floorplan image for each model.
 *  3. Then push floorplan images for each model into QB using QB API Calls
 */
require('dotenv').config();
const QB = require('./qb-setup'); // used to make QB API calls
const fetch = require('node-fetch'); // used to make Matterport API calls
const imagetoBase64 = require('image-to-base64'); // used to push floorplan image to Quickbase application in correct format 

var qb = new QB();

const TID ='bpefzvu4a'; // Digital Twins Table

qb.setHeaders(process.env.QBTOKEN);


// We can probably make this into a function everything else stays the same
// except the fields that we want to pull from table
var body = 
{
    from: TID,
    select: 
    [
        3, // record id field
        21 // model_id field
    ],
    where:'{3.GT.0}',
    sortBy: 
    [
        {
            fieldId: 3,
            order: 'ASC'
        }
    ]
};

qb.setBody(body);

populateFloorplans(qb);


async function populateFloorplans(qb)
{

    try
    {
        var result = await qb.performCall('POST', 'https://api.quickbase.com/v1/records/query');
        var data = result['data'];

        let ids = cleanseData(data);
        console.log(ids);

        var auth = Buffer.from(`${process.env.MPTOKEN}:${process.env.SECRET}`).toString('base64');
        
        const mpHeaders = {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json'
        };

        // will need to begin for loop here
        for(let i =0; i < ids.length; i++)
        {
            var model_id = ids[i][1];
            const mpBody = {
                query: `query{model(id:"${model_id}"){assets{floorplans(formats:"png", flags:photogramy){filename url }}}}`
            }
    
            var response = await fetch('https://api.matterport.com/api/models/graph', {
                method:'POST',
                headers: mpHeaders,
                body: JSON.stringify(mpBody)
            });
    
            var modelData = await response.json();

            var flrpln = modelData['data']['model']['assets']['floorplans'];
            var src = flrpln.filter(mapData => mapData.filename == 'render/vr_colorplan_000.png')[0];

            var encodedImg =  await imagetoBase64(src['url']);

            var body = 
            {
                to: TID,
                data:
                [
                    {
                        3:
                        {
                            value: ids[i][0]
                        },
                        27:
                        {
                            value:
                            {
                                fileName: 'vr_colorplan_000.png',
                                data: encodedImg
                            }

                        }
                    }
                ],
                fieldsToReturn:
                [
                    3,
                    27
                ]
            };

            qb.setBody(body);
            var result = await qb.performCall('POST', 'https://api.quickbase.com/v1/records');
            console.log(result);
        }
    }
    catch(e)
    {
        console.log(e);
    }

}

/**
 *  Auhtor: Carlos Meza
 *  Data: 9/18/2020
 *  Description: This function cleanses the reponse from a QB api call
 *               We simply want to gather and connect the record id and 
 *               model_id to ensure consistency and with model_id for Matterport
 *               API calls
 *  Input: QB API reponse (May want to add string parameters so that it can be utilized by all survey applications)
 *  Output: [1 X 2]  2D Array  containing record and model_id 
 */
function cleanseData(data)
{
    var ids = [];
    for(var i =0; i < data.length; i++)
    {
        var connector = [];
        connector.push(data[i]['3'].value); // stores record Id for QB
        connector.push(data[i]['21'].value); // stores model_id for Matterport API calls
        ids.push(connector);
    }
    return ids;
}