require('dotenv').config();
const fetch = require('node-fetch');
const QB = require('./qb-setup.js');

var qb = new QB();

qb.setHeaders(process.env.QBTOKEN);

const TID ='bpefzvu4a'; // Digital Twins Table

var body = {
    from: TID,
    select: [
        3,
        6
    ],
    where:'{3.GT.0}',
    sortBy: [
        {
            fieldId:3,
            order:'ASC'
        }
    ]
};

qb.setBody(body);

getModelIds(qb);

async function getModelIds(qb)
{
    try
    {
        var result = await qb.performCall('POST', 'https://api.quickbase.com/v1/records/query')
        var data = result['data'];
        console.log(data);

        var ids = [];

        for(var i = 0; i < data.length; i++)
        {
            var mid = '';
            var url = data[i]['6'].value;
            mid = url.slice(url.search('=')+1);

            ids.push(mid);

        }

        console.log(ids.length);
        
        for(var i =0; i < data.length; i++)
        {
            var populateId = 
            {
                to: TID,
                data: 
                [
                    {
                        3: 
                        {
                            value: data[i]['3'].value
                        },
                        21:
                        {
                            value: ids[i]
                        }

                    }
                ],
                fieldsToReturn: 
                [
                    3,
                    21
                ]
            }

            qb.setBody(populateId);
            var result = await qb.performCall('POST','https://api.quickbase.com/v1/records')
            console.log(result);
        }

    }
    catch(e)
    {
        console.log(e);
    }
}