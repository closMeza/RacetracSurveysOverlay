/*
Author: Carlos Meza
Date: 07/22/20
Description: This module will help make setting up Quickbase API Calls much easier
             For right now it will simply setup the header, later we can implement the actual calls in here
             The emd goal is to create a class that can be utilized through all of our api calls
             for now we are simply going to add function calls
*/

//var XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
const fetch = require('node-fetch');


function QB() {
    this.headers = null;
    this.body = null;
    this.responseText = null;
}

/*
Author: Carlos Meza
Date: 07/23/20
Input: quickbase user token
Output = sets the headers for an instance of class QB
*/ 
QB.prototype.setHeaders= function(token)
{
    this.headers =
    {
        'QB-Realm-HostName': 'apeximaging',
        //'User-Agent': (agent),
        'Authorization': 'QB-USER-TOKEN '.concat(token),
        'Content-Type': 'application/json'
    }
}
/*
Author: Carlos Meza
Date: 07/23/20
Input: body of our request
Output = this simply copies the body into the class to preform calls
*/ 
QB.prototype.setBody = function (body)
{
    this.body = body;
}

/*
Author: Carlos Meza
Date: 07/23/20
Input:   httpVerb, and the apiMethod we which to call on quickbase
Output: returns a reponse if the api call was proccessed properly
Notes:  This function utilizies a promise in order to be able to get out of
        callback hell when trying to preform multiple api calls.
        Still needs to be tweaked in order to return the actual reponse
         into a variableS
*/ 
QB.prototype.performCall=  async function(httpVerb, apiMethod)
{
    try
    {
        const response = await fetch(apiMethod, 
            {
                method: httpVerb,
                headers: this.headers,
                body: JSON.stringify(this.body)
            });
        const data = await response.json();
        return data;
    }
    catch(e)
    {
        console.log(e);
        return null;
    }
    /*const _this = this; // this is a reference to the current object
    return new Promise(function(resolve, reject)
    {
            //var this = this;
        var xhr = new XMLHttpRequest();
        
        xhr.open(httpVerb, apiMethod, true);
        for (const key in _this.headers)
        {
            xhr.setRequestHeader(key, _this.headers[key]);
        }
        xhr.onreadystatechange = function()
        {
            if(xhr.readyState == 4 && xhr.status == 200) 
            {
                resolve(xhr.responseText); // why wont you give me the data i want >:(
            }   
            //  need to find the appropriate condition to establish a reject
            // temporarily works for rn
        }
        xhr.send(JSON.stringify(_this.body));
    })
    */
}


module.exports = QB;