require('dotenv').config();
const fetch = require('node-fetch');
const QB = require('./qb-setup');

var qb = new QB();

qb.setHeaders(process.env.QBTOKEN);

const TID ='bpefzvu4a'; // Digital Twins Table

var body = 
{
    from:TID,
    select:
    [
        3,
        21,
    ],
    where:'{3.GT.0}',
    sortBy:
    [
        {
            fieldId:3,
            order:'ASC'
        }
    ]
};

qb.setBody(body);

getModelData(qb);

/**
 *  Author: Carlos Meza
 *  Date: 9/18/2020
 *  Description: 1. Perform initial QB API call to gather rid and model_id fields
 *               2. Cleanse the reponse to pull the previously mentioned fields
 *               3. Perform Matterport API call to gather the width, height, x,y, and resolution 
 *                  parameters needed to populate an accurate map.
 *               4. Peform QB API call to push the parameters to Digital Twins table
 *  
 *  Input: qb class instance that is used to simplify QB calls
 *  Output: Populates fields within QB Racetrac Survey Application specifically to Digital Twins table
 * 
 */


async function getModelData(qb)
{
    try
    {
        var result = await qb.performCall('POST', 'https://api.quickbase.com/v1/records/query');
        console.log(result);
        var data = result['data'];
        console.log(data);

        var ids = cleanseData(data);
        
        var tok = process.env.MPTOKEN;
        var sec = process.env.SECRET;

        var auth = `${tok}:${sec}`;
        auth = Buffer.from(auth).toString('base64');

        const headers = 
        {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json'
        };

        for(var i = 0; i < ids.length; i++)
        {   
            const mpBody={
                query: `query{model(id:"${ids[i][1]}"){assets{floorplans(formats:"png", flags:photogramy){filename url width height resolution origin{x y}}}}}`
            }
    
            var response = await fetch(`https://api.matterport.com/api/models/graph`, {
                method:'POST',
                headers:headers,
                body: JSON.stringify(mpBody)
            });
            var data = await response.json();
            var floorplans = data['data']['model']['assets']['floorplans'];
            var src = floorplans.filter(mapData => mapData.filename == 'render/vr_colorplan_000.png')[0]; // we place the [0] because filter returns an array

            console.log(`The index is: ${i}`);
            console.log(`This is the model id: ${ids[i][1]}`);
            console.log(src);
            
            var fillBody = {
                to:TID,
                data: [
                    {
                        3: {
                            value: ids[i][0]
                        },
                        22: {
                            value: src['width']
                        },
                        23: {
                            value: src['height']
                        },
                        24: {
                            value: src['origin']['x']
                        },
                        25: {
                            value: src['origin']['y']
                        },
                        26: {
                            value:src['resolution']
                        }
                    }
                ],
                feildsToReturn: [
                    3,
                    22,
                    23,
                    24,
                    25,
                    26
                ]
            }
            qb.setBody(fillBody);

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
 *               model_id to ensure consistency and will model_id for Matterport
 *               API calls
 *  Input: QB API reponse
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