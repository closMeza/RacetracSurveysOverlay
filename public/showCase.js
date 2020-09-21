//'use strict'; this prevents the use of undeclared variables

// Main toggle var
var mainToggle;
var mainOverlay;

// Global vars associated with Tag Seacher
var list;
var tagsOverlay;
var searchBar;
var searchBtn;
var tagToggle;
var reset;

//Global vars assocated with details and model info
var modelInfo;
var details;

//Global for showcase
var showcaseFrame;
var model_id;

var image_details= {
    w: '',
    h:'',
    x:'',
    y:'',
    res: ''
}

var settings = {
    sweep: '',
    mode: 'INSIDE',
    transition: 'FADEOUT'
  };

// This sets the global vars above and sets up connection
// to matterport once the page has finished loading
document.addEventListener('DOMContentLoaded', () => {
    //Main Overlay Connections
    mainToggle = document.getElementById('main-toggle');
    mainToggle.style.visibility = 'hidden';
    mainOverlay = document.getElementById('overlay');
    mainOverlay.style.visibility = 'hidden';
    
    showcaseFrame = document.getElementById('showcase_iframe');

    //Search Overlay Connections
    searchBar = document.getElementById('search-bar');
    searchBtn = document.getElementById('search-btn')
    list = document.getElementById('mt-container');
    reset = document.getElementById('reset');

    //Mattertag Overlay Connections
    tagsOverlay = document.getElementById('tags-container');
    tagToggle = document.getElementById('tags-toggle');
    tagsOverlay.style.visibility = 'hidden';

    //Map Overlay Connections
    map = document.getElementById('map');
    mapToggle = document.getElementById('minimap-toggle');
    mapOverlay = document.getElementById('minimap-overlay');
    mapOverlay.style.visibility = 'hidden'


    modelInfo = document.getElementById('model-info');

    //Details Overlay Connections
    detailsToggle = document.getElementById('details-toggle');
    detailsOverlay = document.getElementById('details-overlay');
    details = document.getElementById('details');
    detailsOverlay.style.visibility= 'hidden';


    var url = new URL(window.location.href);

    var model_id = url.searchParams.get('m');
    
    //Entry point to Quickbase implementation
    // setting up Quickbase Client
    var qb = new QuickBaseClient();
    var rUrl = '27';
    var rWidth = '22';
    var rHeight = '23';
    var rX = '24';
    var rY = '25';
    var rRes = '26';
    qb.SetAppToken('c3hcgcwxvc9qsbw5iqjhb4gjk94');
    const TDBID = 'bpefzvu4a';

    //Establishin Dom for Quickbase sdk
    var doc = qb.DoQuery(TDBID,'',`${rUrl}.${rWidth}.${rHeight}.${rX}.${rY}.${rRes}`,'3','');
    //console.log(doc);


    var records = qb.selectNodes(doc,"*/table/records/record");

    //Quickbase breakdown
    var record_id = url.searchParams.get('rd');

    var currRecord = records[record_id - 1].children;


    //Populating floorplan image
    var flrpln = currRecord[0].textContent;

    // need to remove the prefix of img source to load flrpln properly
    // Note that this condition was created because this model_id does not have a correct flrpln
    const PNGLEN = 20;
    flrpln = flrpln.substr(PNGLEN);
    //console.log(flrpln);
    /*if(model_id == '2ETqALFrTms')
    {
        flrpln = flrpln.replace('vr_colorplan_001.png', '');
    }
    else
    {
        flrpln = flrpln.replace('vr_colorplan_000.png', '');
    }*/
    

    var pic = document.getElementById('pic');
    pic.src = flrpln;

    //Populating Map Scalar values
    image_details['w'] = currRecord[1].textContent;
    image_details['h'] = currRecord[2].textContent;
    image_details['x'] = currRecord[3].textContent;
    image_details['y'] = currRecord[4].textContent;
    image_details['res'] = currRecord[5].textContent;

    //console.log(image_details);




    showcaseFrame.setAttribute('src', `https://my.matterport.com/show/?m=${model_id}&title=0&play=1&gt=0&hr=0`) //needed to remove &qs=1 due to errors on matterports end

    showcaseFrame.addEventListener('load', showcaseLoader, true);

})

/**
 * Author: Carlos Meza
 * Date: 08/14/2020
 * Description: This function sets initiates  the connection to the matterport SDK
 */
function showcaseLoader()
{
    try
    {
        window.MP_SDK.connect(showcaseFrame,  '6bdbe628d7b3445ca26b16a311306d0e', '3.4' )
            .then(showcaseHandler)
            .catch((e) => console.log(e));
    }
    catch(e)
    {
        console.log(e);
    }
}

/**
 * Author: Carlos Meza
 * Date: 08/14/2020
 * Input: mpSdk The Primary Object that contains all of Matterports SDk functionality
 * Description: This is where all the interaction for the Matterport Model takes place 
 */
async function showcaseHandler(mpSdk)
{
    mainToggle.style.visibility = 'visible';
    mainOverlay.style.visibility = 'visible';

       // Added this check for mobile devices only
       if (/Mobi|Android/i.test(navigator.userAgent)) 
       {
           console.log('on mobile');
       }
       /*else
       {
           if(image_details['res'] < 6.70)
             {
                mapOverlay.style.width = image_details['w'] +'px';
                mapOverlay.style.height = image_details['h'] + 'px';
             }
       }*/

    console.log("Connected to Matterport SDK");
    var model = await mpSdk.Model.getData();
    console.log("Connected to " + model.sid);

    // This populates the title-gui elements
    var mdlDetails = await mpSdk.Model.getDetails();
    modelInfo.textContent = mdlDetails.name;
    details.textContent = mdlDetails.formattedAddress;

    //need to add minimap image here
    // Ive tried changing mode to floorplan then using renderer to take a screenshot
    // this gives me an image but its a bit distorted also if its not loaded properly it screenshot is distorted
    

    //Displays current position of user on minimap
    mpSdk.on(mpSdk.Sweep.Event.ENTER, switchedSweep);


    // MiniMap functionality begins here
    var mattertags = await mpSdk.Mattertag.getData();
    // This is the entry point for mattertag search functionality

    // initatinig coords for sweeps in minimap
    minX = maxX = minY = maxY =0;
    
    // initializes array of sweeps
    // utilizing js array function map to feed an array of sweeps
    // which is defined as objects with sweep id and x/z coords
    var sweeps = model.sweeps.map((sweep)=> {
        console.log(sweep.floor);
        if(sweep.position && sweep.floor == 0) // Note that this coniditon only applies to Racetrac due to sweeps on roof
        {
            var marker = {
                mid: sweep.uuid,
                x: sweep.position.x || 0,
                y: sweep.position.z || 0,
                z: sweep.position.y || 0
            }

            // gets the positon of the first sweep and stores it into settings object 
            // from above
            if(marker.x ==0 && marker.y ==0)
            {
                settings.sweep = sweep.uuid;
            }
  
            return marker; // returns object with uuid, x, & z coords

        }
    });

    // Mapping of the sweeps utilizing sweepsToMap function
    sweeps.map(sweepsToMap);

    /**
     * Author: Carlos Meza
     * Date: 8/21/2020
     * Description: Places each sweep inside the minimap at their corresponding position within the model.
     * Input: Sweep object
     * Output: Places sweep inside minimap at its correct position
     */
    function sweepsToMap(sweep)
    {
        if(sweep)
        {
            var yScalar = (sweep.y + image_details['y'] * 1) * image_details['res'];
            var y = 100 + yScalar/ image_details['h'] * 100 - 3; // 3 is equal to offset

            var xScalar = (sweep.x + image_details['x'] * -1) * image_details['res'];
            var x = xScalar/ image_details['w'] * 100 - 2; // 2 is equal to offset

            if((x < 0 || x > 100) || (y < 0  || y > 100))
            {
                console.log('This sweep is outof bounds of minimap');
                return;
            }

            var btn = document.createElement('BUTTON'); // creates the elem
            var attList = 'sweep z-depth-3'; //class defined inside styles.css
            //var x = scaleToMap(sweep.x, minX, maxX,  67, 19); // these numbers give the appropiate postion for each sweep
            //var y = scaleToMap(sweep.y, minY, maxY, 57, 19); // these numbers give the appropiate postion for each sweep

            btn.setAttribute('id', 'm' + sweep.mid); // setting the attributes for the button element
            btn.setAttribute('value', sweep.mid);
            btn.style.left = x + '%';   // positioning buttons accordingly to fit minimap
            btn.style.top = y + '%';
            btn.style.transform = 'scale(1,1)';
            btn.style.display = 'inline-block';
            btn.setAttribute('class', attList); // attaches  class to button element

            btn.addEventListener('click', moveToSweep); // creates an eventlistener for each button calls moveToSweep func

            map.appendChild(btn);  // attaches button to parent element MAP
        }
    }


    /**
     * Author: Carlos Meza
     *  Description: When a sweep is selected in minimap moves user to that position
     */
    function moveToSweep(e)
    {
        return mpSdk.Sweep.moveTo(
            e.target.value || document.getElementById('m' + e).value, {
                transition: mpSdk.Sweep.Transition[settings.transition]
            })
            .then((result) => console.log(result))
            .catch((error) =>console.log(error));
    }

   
    
    
    var data = parseMattertags(mattertags);

    data.forEach(appendToUList)

    /**
     * Author: Carlos Meza
     * Description: Gathers mattertags label/ description and mattertag id
     * Input: Array of mattertags
     * Output: 2d array [[label/descrip, sid]]
     */
    function parseMattertags(mattertags)
    {
        var tags = [];
        for(i =0; i < mattertags.length; i++)
        {
            var str = mattertags[i].label + ' ' + mattertags[i].description;
            tags.push([str, mattertags[i].sid]);

        }
        tags.sort();
        return tags;
    }

    /**
     * Author: Carlos Meza
     * Description: Appends each mattertag to unordered list within index.html
     * Input: A single element from 2d array of mattertags
     * Output: Refer to description
     */
    function appendToUList(data)
    {
        var li = document.createElement('li');
        li.setAttribute('class', 'tag')
        li.textContent = data[0];
        li.setAttribute('id',data[1])
        list.appendChild(li);
    }

    /**
     * Author: Carlos Meza
     * Description: Moves the user to matter tag based on click
     * Input: List item is clicked
     * Output: User then gets moved to appropriate tag
     */
    list.addEventListener('click', (e)=> {
        if (/Mobi|Android/i.test(navigator.userAgent)) 
        {
            mpSdk.Mattertag.navigateToTag(e.target.id,  mpSdk.Mattertag.Transition.FADEOUT);
            mapOverlay.style.visibility ='hidden';
            tagsOverlay.style.visibility ='hidden';

        }
        else
        {
            mpSdk.Mattertag.navigateToTag(e.target.id,  mpSdk.Mattertag.Transition.FADEOUT);
            mapOverlay.style.visibility ='hidden';
        }
    })

    //search input functionality activates on pressing Enter
    searchBar.addEventListener('keyup', (e) => {
        if(e.keyCode==13)
        {
            e.preventDefault();
            search();
        }
    })

    //search input functionality via typing within searchbar
    searchBar.addEventListener('input', search);

    //search input functionality via search button
    // this maybe removed and replaced with resetting feature
    //searchBtn.addEventListener('click', search)

    reset.addEventListener('click', () => {
        searchBar.value = '';
        search();
    })


    /**
     * Author: Carlos Meza
     * Description: Searches 2d array of mattertags and returns 
     *              most relavent tags based on user input
     */
    function search() {
        var input, filter, ul, li, i, txtValue;
        input = searchBar;
        filter = input.value.toLowerCase();
        ul = list;
        li = ul.getElementsByTagName('li');

        for(i =0; i < li.length; i++)
        {
            txtValue = li[i].textContent || li[i].innerText;
            if(txtValue.toLowerCase().indexOf(filter) > -1)
            {
                li[i].style.display = '';
            }
            else
            {
                li[i].style.display ='none';
            }
        }
    }

    /**
     * Author: Carlos Meza
     * Description: Allows the toggling of mattertag search functionality
     * 
     */
    tagToggle.addEventListener('click', ()=> {
        if(tagsOverlay.style.visibility == 'hidden')
        {
            tagsOverlay.style.visibility = 'visible';
            mapOverlay.style.visibility ='hidden';
            detailsOverlay.style.visibility = 'hidden';
        }
        else if(tagsOverlay.style.visibility == 'visible')
        {
            tagsOverlay.style.visibility ='hidden';
        }
        
    });

    /**
     * Author: Carlos Meza
     * Description: Allows the toggling of minimap functionality
     * 
     */
    mapToggle.addEventListener('click', ()=> {
        //console.log('minimap toggle clicked')
        if(mapOverlay.style.visibility == 'hidden')
        {
            mapOverlay.style.visibility = 'visible';
            tagsOverlay.style.visibility ='hidden';
            detailsOverlay.style.visibility = 'hidden';
        }
        else if(mapOverlay.style.visibility == 'visible')
        {
            mapOverlay.style.visibility ='hidden';
        
        }
    });

    /**
     * Author: Carlos Meza
     * Description: Allows the toggling of details functionality
     * 
     */
    detailsToggle.addEventListener('click', () => {
        if(detailsOverlay.style.visibility == 'hidden')
        {
            detailsOverlay.style.visibility = 'visible';
            tagsOverlay.style.visibility ='hidden';
            mapOverlay.style.visibility ='hidden';
        }
        else if(detailsOverlay.style.visibility == 'visible')
        {
            detailsOverlay.style.visibility = 'hidden';
        }
    });

      /**
     * Author: Carlos Meza
     * Description: Allows the toggling of overlay functionality
     * 
     */
    mainToggle.addEventListener('click', () => {
        if(mainOverlay.style.visibility == 'visible')
        {
            mainOverlay.style.visibility = 'hidden';
            tagsOverlay.style.visibility ='hidden';
            mapOverlay.style.visibility ='hidden';
            detailsOverlay.style.visibility = 'hidden';
            mainToggle.setAttribute('class', 'fas fa-chevron-right fa-2x')

        }
        else if(mainOverlay.style.visibility == 'hidden')
        {
            mainOverlay.style.visibility = 'visible';
            mainToggle.setAttribute('class', 'fas fa-chevron-left fa-2x')
        }
    })

    /**
     * Author: Carlos Meza
     * Description: Places marker on minimap based on user's position
     * Input: prev sweep, curr sweep
     * Output: Changes active sweep to the one entered by user
     */
    function switchedSweep(prev, curr)
    {
        var newSweep  = document.getElementById('m' + curr);
        var oldSweep = document.getElementById('m' + prev) || curr;

        settings.sweep = (newSweep && newSweep.value) || '';
        toggleSweep(newSweep,oldSweep);
    }

    /**
     * Author: Carlos Meza
     * Description: removes active class from old sweep pos
     *              and adds it to new sweep pos
     *              this is in relation to minimap
     */
    function toggleSweep(curr, prev)
    {
        if(prev) 
        {
            prev.classList.remove('active');
        }

        if(curr)
        {
            curr.classList += ' active';
        }
    }


}