// global variables
var dbName = 'madrid4all.db';
var db = new PouchDB(dbName);
var map;
var originalArrayOfLocations = [];
var arrayOfLocations = [];
var markersOnMap = [];
var selectedCategories = [];
// lat and lng of the "main" city used to center the map
var mainCityGeoCode = {
  "lat": 40.4226654,
  "lng": -3.7034987
}
// list of functions
// Function to Show Map of Services
function loadMap() {
  var mapPosition = mainCityGeoCode;
  var mapCanvas = document.getElementById("servicesMap");
  var mapOptions = {
    // create map centered in 'mainCity'
    center: mapPosition,
    zoom: 12 // bigger number = closer map
  };
  // create new map and center it in 'mainCity'
  map = new google.maps.Map(mapCanvas, mapOptions);
}
/// callback to load the page content
function initPageContent(loadedLocations) {
  originalArrayOfLocations = loadedLocations;
  arrayOfLocations = originalArrayOfLocations;
  // check if the db is empty. In that case, load the content of data.js file
  db.info().then(function (result) {
    if (result.doc_count === 0) {
      console.log('DB empty! Lets add data.json into it...');
      db.bulkDocs(arrayOfLocations).then(function (result) {
        console.log("Locations added successfully to DB. ");
        createDBIndexes();
      }).catch(function (err) {
        console.log("Error while adding locations to DB: " + err);
      });
    } else {
      console.log('DB not empty. It contains already ' + result.doc_count + ' records. No extra content is loaded from data.js.')
    }
    addLocationsToMap(arrayOfLocations);
  });
}
// function to creat search indexed on the database
function createDBIndexes() {
  // create the necessary db indexes
  db.createIndex({
    index: {
      fields: ['categories', 'orgName']
    }
  }).then(function (result) {
    console.log("Successfully created index over the categories");
  }).catch(function (err) {
    console.log("Error creating index on the categories: " + err);
  });
}
// display array of markers on the map
function addLocationsToMap(arrayOfLocations){
  // add the markers to the map
  arrayOfLocations.forEach(markerData => {
    console.log("Adding marker " + markerData.orgName + ", " + markerData.address + " to the map...");
    addSingleLocationToMap(markerData);
  });
  // show table with the markers
  updateResultTable(arrayOfLocations);
}
// function to update the resultTable
function updateResultTable(arrayOfLocations) {
  w3.displayObject("resultTable", { "records": arrayOfLocations });
  w3.sortHTML('#resultTable', '.item', 'td:nth-child(1')
}
// adds a marker to the map.
function addSingleLocationToMap(markerData) {
  // initialize variables
  var address = markerData.fullAddress;
  var markerPosition = new google.maps.LatLng(markerData.geocode);
  var marker = new google.maps.Marker({
    map: map,
    position: markerPosition,
    title: markerData.orgName + ". Click for more details"
  });
  // create an infoWindow to be linked to the marker
  var infowindow = new google.maps.InfoWindow({
    content: "<strong>" + markerData.orgName + "</strong><br><em>" + address + "</em><br><a href=\"" + markerData.orgWeb + "\">" + markerData.orgWeb + "</a>" // HTML contents of the InfoWindow
  });
  // add a Click Listener to our marker
  google.maps.event.addListener(marker, 'click', function () {
    infowindow.open(map, marker); // Open our InfoWindow
  });
  // update the list of displayed markers
  markersOnMap.push(marker);
}
// callback for the search by text
function onTextSearchInput(inputValue) {
  w3.filterHTML('#resultTable', '.item', inputValue);
}
// callback for the search by text
function onCategoryClick(selectedCategory) {
  console.log("Clicked on category " + selectedCategory);
  if (selectedCategories.includes(selectedCategory)) {
    // unselect category and search again
    selectedCategories.pop(selectedCategory);
    var element = document.getElementById(selectedCategory);
    element.classList.remove("w3-light-grey");
    findLocationsInDatabase();
  } else {
    // select category and search again
    selectedCategories.push(selectedCategory);
    var element = document.getElementById(selectedCategory);
    element.classList.add("w3-grey");
    findLocationsInDatabase();
  }
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
// function to update the list of results after a change in the search form
function findLocationsInDatabase() {
  db.find({
    selector: { categories: { $elemMatch: { $in: selectedCategories } } },
    fields: ['_id', 'orgName', 'district', 'postalCode', 'languages', 'fullAddress', 'geocode'],
  }).then(function (result) {
    // clear previous results
    clearPreviousResults();
    // TODO: Fix me! This 'arrayOfLocations' must contain gmaps.Locations(), not "markerData"
    arrayOfLocations = result["docs"];
    console.log(arrayOfLocations.length + " markers found for category '" + selectedCategories.toString() + "'.");
    // show found locations in the map
    addLocationsToMap(arrayOfLocations);
    // update result table with the found locations
    updateResultTable(arrayOfLocations);
  }).catch(function (err) {
    console.log(err);
  });
}
// callback for the click on a row of the result table
function onRowClick(markerId) {
  console.log("Clicked row of marker with id: " + markerId);
  db.get(markerId + "").then(function (doc) {
    console.log("Fetched marker with id '" + doc["_id"] + "' and name '" + doc["orgName"] + "'-");
    // TODO: complete action linked to the selection of a row
  }).catch(function (err) {
    console.log(err);
  });
}
function onResetClick() {
  console.log("Clicked on reset.")
  //document.getElementById("searchText").textContent = "";
  w3.toggleClass('.w3-grey', 'w3-grey', 'w3-light-grey')
  w3.toggleClass('.w3-show', 'w3-show', 'w3-hide')
  // clear previous results
  clearPreviousResults();
  initPageContent(originalArrayOfLocations);
}
// script to open and close sidebar
function w3_open() {
  document.getElementById("mySidebar").style.display = "block";
  document.getElementById("myOverlay").style.display = "block";
}
function w3_close() {
  document.getElementById("mySidebar").style.display = "none";
  document.getElementById("myOverlay").style.display = "none";
}
// script to open or close an accordion in the left menu
function toggleAccordionSection(id) {
  // search by the category
  onCategoryClick(id);
  // alter the styles
  var x = document.getElementById(id);
  if (x.className.indexOf("w3-show") == -1) {
    x.className += " w3-show";
    x.previousElementSibling.className =
      x.previousElementSibling.className.replace("w3-light-grey", "w3-grey");
  } else {
    x.className = x.className.replace(" w3-show", "");
    x.previousElementSibling.className =
      x.previousElementSibling.className.replace("w3-grey", "w3-light-grey");
  }
}