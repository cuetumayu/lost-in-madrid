// global variables
var vueResultCounter = new Vue({
  el: '#resultCounter',
  data: {
    message: '-'
  }
});
var vueResultTable = new Vue({
  el: '#resultTable',
  data: { locations: arrayOfLocations },
  methods: {
    // callback for the click on a row of the result table
    onLocationClick: function (locationId) {
      console.log("Clicked onLocationClick with id: " + locationId);
      // update UI
      locDetailsDiv = document.getElementsByClassName("loc-details");
      for (i = 0; i < locDetailsDiv.length; i++) {
        locDetailsDiv[i].className = locDetailsDiv[i].className.replace(" w3-show", " w3-hide");
      }
      w3.toggleClass('#loc-' + locationId + '-details', 'w3-hide', 'w3-show');
      this.openInfoTab('general-info-' + locationId);
    },
    // callback to handle the tab switch on the table result
    openInfoTab: function (tabName) {
      var i, x, tablinks;
      x = document.getElementsByClassName("infoTab");
      for (i = 0; i < x.length; i++) {
        x[i].style.display = "none";
      }
      tablinks = document.getElementsByClassName("tablink");
      for (i = 0; i < x.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" w3-border-red", "");
      }
      document.getElementById(tabName + '-tablink').className += " w3-border-red";
      document.getElementById(tabName).style.display = "block";
    },
    // highlight marker in map
    showLocationMarker: function (locationId) {
      console.log("showLocationMarker: " + locationId);
      for (var i = 0; i < markersOnMap.length; i++) {
        var currMarker = markersOnMap[i];
        if (currMarker.get('id') == locationId) {
          currMarker.setAnimation(google.maps.Animation.BOUNCE);
        } else {
          currMarker.setAnimation(null);
        }
      }
      document.getElementById('servicesMap').scrollIntoView();
    },
    printServices: function (locId) {
      // console.log("printServices for locId " + locId);
      var output = [];
      // get the services linked to this location
      var locServicesItem = originalLocationServices.find(function (element) {
        return element.locationID == locId;
      });
      // get the details for each service
      if (locServicesItem == null) {
        return " - "
      } else {
        Object.keys(locServicesItem).forEach(function (svcId, index) {
          // the partern of the 'keys' for the services are 'c#s#'. Remember 'locationID' fields also exists
          if (svcId.startsWith("c")) {
            // console.log("svcId: " + svcId);
            output.push(originalServices.find(function (element) {
              return element.key == svcId;
            })[selectedLanguage])
          } else {
            if(svcId.localeCompare("locationID") != 0){
              console.log("Invalid service key pattern : '" + svcId + "'");
            }
          }
        });
      }
      return output.join(" - ");
    },
    printAdditionalInfo : function(additionalInfo){
      return additionalInfo[selectedLanguage];
    },
    printTimetable : function(timeTable){
      return timeTable[selectedLanguage];
    },
    printWaysOfContact : function(waysOfContact) {
      // TODO: Find the translations
      return waysOfContact;
    }
  }
});
var vueSideBarMenu = new Vue({
  el: '#sideBarMenu',
  data: { listOfServices: originalServices },
  methods: {
    // callback for the click on a category
    onCategoryClick: function (svcItem) {
      console.log("Clicked on category " + svcItem.key);
      // update the UI
      // if previously selected, means this is an 'un-selection'
      var childServiceIDs = getChildServiceIDs(svcItem.key);
      var childrenIncluded = childServiceIDs.reduce((previouslyIncluded, curChildId) => previouslyIncluded || selectedServices.includes(curChildId), false);
      if (selectedServices.includes(svcItem.key) || childrenIncluded) {
        if(childServiceIDs != null) {
          childServiceIDs.forEach(function(curChildID){
            w3.removeClass('#' + curChildID + '-btn', 'w3-text-red');
          });
        }
      }
      w3.toggleClass("." + svcItem.category + "-child", 'w3-hide', 'w3-show');
      // trigger the find operation
      findLocationsInDatabase("CATEGORY", svcItem.key);
    },
    // calback for the click on service
    onServiceClick: function (serviceKey) {
      console.log("Clicked on service " + serviceKey);
      // update the UI
      w3.toggleClass('#' + serviceKey + '-btn', 'w3-text-red');
      // trigger the find operation
      findLocationsInDatabase("SERVICE", serviceKey);
    }
  }
});
// list of functions
// Function to Show Map of Services
function loadMap() {
  var mapPosition = mainCityGeoCode;
  var mapCanvas = document.getElementById("servicesMap");
  var mapOptions = {
    // create map centered in 'mainCity'
    center: mapPosition,
    zoom: 11 // bigger number = closer map
  };
  // create new map and center it in 'mainCity'
  map = new google.maps.Map(mapCanvas, mapOptions);
}
// callback to load the locationServicesRelations
function initLocationServicesRelations(loadedLocationServicesRelations) {
  // console.log("initLocationServicesRelations: " + loadedLocationServicesRelations);
  originalLocationServices = loadedLocationServicesRelations;
}
/// callback to load the page content
function initPageContent(loadedLocations) {
  // console.log("initPageContent with " + loadedLocations);
  originalLocations = loadedLocations;
  arrayOfLocations = originalLocations;
  initDBContent();
  updateResultsAndMap();
}
// callback to load menu content: categories, services, etc.
function initMenuContent(loadedServices) {
  console.log("initMenuContent...");
  originalServices = loadedServices;
  vueSideBarMenu.listOfServices = originalServices;
  w3.getHttpObject("/data/locations.json", initPageContent);
}
// display array of markers on the map
function updateResultsAndMap() {
  // console.log("updateResultsAndMap...");
  // add the markers to the map
  arrayOfLocations.forEach(markerData => {
    //console.log("Adding marker " + markerData.orgName + ", " + markerData.address + " to the map...");
    addLocationToMap(markerData);
  });
  // update resultCounter and resultTable
  if (arrayOfLocations.length > 0) {
    vueResultCounter.message = arrayOfLocations.length + " " + getTranslatedLabel("result-found");
    vueResultTable.locations = arrayOfLocations;
    w3.show('#resultTable');
    w3.sortHTML('#resultTable', '.item', 'td:nth-child(1)')
  } else {
    vueResultCounter.message = getTranslatedLabel("no-result-found");
    vueResultTable.locations = [];
    w3.hide('#resultTable');
  }
  console.log("vueResultCounter.message: " + vueResultCounter.message);
}
// adds a marker to the map.
function addLocationToMap(markerData) {
  // initialize variables
  var address = markerData.fullAddress;
  var markerPosition = new google.maps.LatLng(markerData.geocode);
  var marker = new google.maps.Marker({
    map: map,
    id: 'loc-marker-' + markerData.ID,
    position: markerPosition,
    title: markerData.orgName + ". " + getTranslatedLabel("more-info")
  });
  // create an infoWindow to be linked to the marker
  var infoWindowCode = "<strong>" + markerData.orgName + "</strong><br>";
  infoWindowCode += "<em>" + address + "</em><br><a href=\"" + markerData.orgWeb + "\">" + markerData.orgWeb + "</a><br>";
  infoWindowCode += "<a href=\"javascript:void(0)\" onClick=\"showLocationDetails(event, '" + markerData.ID + "')\">" + getTranslatedLabel("click-for-more-details") + "</a><br>";
  //console.log("infoWindowCode: " + infoWindowCode); 
  var infowindow = new google.maps.InfoWindow({
    content: infoWindowCode
  });
  // add a click listener to our marker
  google.maps.event.addListener(marker, 'click', function () {
    infowindow.open(map, marker); // Open our InfoWindow
    this.setAnimation(null);
  });
  // update the list of displayed markers
  markersOnMap.push(marker);
}
// show location details
function showLocationDetails(event, locationId) {
  console.log("showLocationDetails: " + locationId);
  vueResultTable.onLocationClick(locationId);
  document.getElementById('loc-' + locationId).scrollIntoView();
}
// callback for the search by text
function onTextSearchInput(inputValue) {
  w3.filterHTML('#resultTable', '.item', inputValue);
}
// callback for the click on targetChild
function onTargetChildrenClick() {
  console.log("Clicked onTargetChildrenClick");
  targetChildren = !targetChildren;
  // trigger the find operation
  findLocationsInDatabase("FILTER", -1);
  // update the UI
  w3.toggleClass('#targetChildren', 'w3-red');
}
// callback for the click on targetWomen
function onTargetWomenClick() {
  console.log("Clicked onTargetWomenClick");
  targetWomen = !targetWomen;
  // trigger the find operation
  findLocationsInDatabase("FILTER", -1);
  // update the UI
  w3.toggleClass('#targetWomen', 'w3-red');
}
// callback for the click on targetOrigin
function onTargetOriginClick() {
  console.log("Clicked onTargetOriginClick");
  targetOrigin = !targetOrigin;
  // trigger the find operation
  findLocationsInDatabase("FILTER", -1);
  // update the UI
  w3.toggleClass('#targetOrigin', 'w3-red');
}
// callback for the click on targetLGTBIQ
function onTargetLGTBIQClick() {
  console.log("Clicked onTargetLGTBIClick");
  targetLGTBIQ = !targetLGTBIQ;
  // trigger the find operation
  findLocationsInDatabase("FILTER", -1);
  // update the UI
  w3.toggleClass('#targetLGTBIQ', 'w3-red');
}
// sets the map on all the displayed markers
function setMapOnAllMarkers(map) {
  for (var i = 0; i < markersOnMap.length; i++) {
    markersOnMap[i].setMap(map);
  }
}
// function to clear all the previous results
function clearPreviousResults() {
  setMapOnAllMarkers(null);
  markersOnMap = [];
  arrayOfLocations = [];
}
// function to implement the language change
function onLanguageChange(language) {
  console.log("onLanguageChange: " + language);
  selectedLanguage = language;
}
// function to reset the search results
function onResetClick() {
  console.log("Clicked on reset.");
  //document.getElementById("searchText").textContent = "";
  w3.removeClass('.w3-text-red', 'w3-text-red');
  w3.removeClass('.w3-red', 'w3-red');
  w3.toggleClass('.w3-show', 'w3-show', 'w3-hide');
  // clear previous results
  clearPreviousResults();
  initPageContent(originalLocations);
  // clean selected criterias
  selectedCategories = [];
  selectedServices = [];
  targetWomen = false;
  targetChildren = false;
  targetOrigin = false;
}
// script to open sidebar
function w3_open() {
  document.getElementById("mySidebar").style.display = "block";
  document.getElementById("myOverlay").style.display = "block";
}
// script to close sidebar
function w3_close() {
  document.getElementById("mySidebar").style.display = "none";
  document.getElementById("myOverlay").style.display = "none";
}
// function to handle the different static message
function getTranslatedLabel(labelId) {
  if ("ES" == selectedLanguage) {
    switch (labelId) {
      case 'no-result-found':
        return "No se ha encontrado ningún resultado";
      case 'result-found':
        return " resultado(s) encontrados";
      case 'click-for-more-details':
        return 'Pincha aquí para más detalles';
      case 'more-info':
        return 'Más información';
      default:
        console.log("Unknown labelId: " + labelId);
        return "";
    }
  } else if ("EN" == selectedLanguage) {
    switch (labelId) {
      case 'no-result-found':
        return "No results found";
      case 'result-found':
        return " result(s) found";
      case 'click-for-more-details':
        return 'Click here for more details';
      case 'more-info':
        return 'More info';
      default:
        console.log("Unknown labelId: " + labelId);
        return "";
    }
  } else if ("FR" == selectedLanguage) {
    switch (labelId) {
      case 'no-result-found':
        return "Aucun résultat trouvé";
      case 'result-found':
        return " résultat(s) trouvé(s)";
      case 'click-for-more-details':
        return 'Click ici pour plus de détails';
      case 'more-info':
        return 'Plus d\'info';
      default:
        console.log("Unknown labelId: " + labelId);
        return "";
    }
  } else {
    console.log("Unknown language: " + selectedLanguage);
  }
}
// function to translate categories into labels
function translateArrayOfCategories(arrayOfCategories) {
  console.log("translateArrayOfCategories: " + arrayOfCategories);
  return arrayOfCategories.map(x => originalCategories[x][selectedLanguage]);
}
// function to get the list of child services of the indicated one
function getChildServiceIDs(curServiceID) {
  console.log("getChildServices - curServiceID: " + curServiceID);
  var listOfChildren = [];
  var curServiceCat = curServiceID.substring(0, curServiceID.indexOf("s"));
  originalServices.forEach(function (item) {
    if (curServiceID != item.key && item.category == curServiceCat) {
      listOfChildren.push(item.key);
    }
  });
  return listOfChildren;
}

