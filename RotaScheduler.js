function displayPrompt() {
    var ui = SpreadsheetApp.getUi();
    var name = ui.prompt(
      "Please enter your full name as it appears on the sheet:",
      ui.ButtonSet.OK_CANCEL);
    console.log(name.getResponseText());
    var calendarID = ui.prompt(
      "Please add your Calendar ID found under the 'Integrate Calendar' section of your Calendar Settings:",
      ui.ButtonSet.OK_CANCEL);
    console.log(calendarID.getResponseText());
  
    if (calendarID == null || name == null) {
      console.error("Values haven't been input");
      return;
    }
    scheduleShifts(name.getResponseText(), calendarID.getResponseText());
  
  }
  
  function scheduleShifts(name, calendarID) {
  
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  
    const eventCal = CalendarApp.getCalendarById(calendarID);
    if (eventCal == null) {
      console.error("cannot access calendar with id: " + calendarID);
      return;
    }
  
    // attempt to find name in spreedsheet
    try {
        var [sheet_with_name, y_range] = findRowRange(name, spreadsheet);
    } catch(TypeError) {
      console.error("cannot locate name in document, please enter the name as it appears exactly in the cell");
      return;
    }
  
    // attempt to find the weekly dates in the sheet with our found name
    try {
        var x_range = findColumnRange(sheet_with_name);
    } catch(TypeError) {
      console.error("cannot locate range in sheet");
      return;
    }
  
    //now that we have our x and y ranges, we're going to iterate through and create a calendar event for each
    console.log("creating calendar events");
    // iterate through the weeks (x range)
    for (let week of x_range){
      let column = week.column;
      let starting_date = week.col_val;
  
      // one day
      const MILLIS_PER_DAY = 1000 * 60 * 60 * 24;
  
      // iterate through the days of the week (y range)
      for (let day = 0; day < y_range.length; day++){
        let row = y_range[day];
        // retrieve the cell value 
        rota_value = sheet_with_name.getRange(row, column).getValue();
  
        // determine the date we're initially passing into the calendar
        let day_date = new Date(starting_date.getTime() + (day * MILLIS_PER_DAY));
        console.log("day date is :" + day_date);
        try {
          var [eventLabel, startTime, endTime] = parseRotaValue(rota_value, day_date);
        } catch(TypeError) {
          console.log("value wasn't in our dictionary");
          continue;
        }
  
        // double check that we got a value returned
        if (eventLabel != null & startTime != null & endTime != null) {
          // try and create our calendar event
          try {
            console.log("running calendar event");
            eventCal.createEvent(eventLabel, startTime, endTime);
          } catch(TypeError) {
            console.warn("failed to created calendar event");
            continue;
          }
  
        }
      }
    }
  }
  
  // this function takes in a name and spreadsheet and searches for the name in the document.
  // If it succeeds, it will return the specific sheet the name was found, as well as the range of 
  // rows (the y range) that signify the days of the week.
  function findRowRange(name, sheet){
    var nameFinder = sheet.createTextFinder(name).matchCase(true);
    
    var nameInstances = nameFinder.findAll();
    
    // edge cases
    if (nameInstances.length > 1) {
      console.error("Found more than 1 instance of name in Rota, results might not be accurate");
      return;
    } else if (nameInstances.length <= 0) {
      console.error("Did not find name in rota, cannot continue");
      return;
    } 
    // identifies the cell our targeted name is at
    var cellLocation = nameInstances[0];
  
    let nameRow = cellLocation.getRow();
    
    // Now we're going to find the closest row occurence of "Mon/Monday" from our cell name, that will give us the Y range 
  
    // hardcode for now to keep moving, will return later to deal with edge cases (e.g. Mon in name, document change)
    var y_range = [...Array(7).keys()].map(i => i + nameRow-1);
  
  
    // pass back the sheet so we can limit our date column search to within that 
    let nameSheet = cellLocation.getSheet();
  
    return [nameSheet, y_range];
  }
  
  // This function takes the sheet where we found the name, then searches for the row with the greatest number of columns with a date in them. By finding this row, we know the x range where we will be searching in.
  function findColumnRange(sheet) {
    // regex for MM/DD/YYYY
    var regexForDate = String.raw`^(0[1-9]|[1-9]|1[0-2])\/([1-9]|0[1-9]|1\d|2\d|3[01])\/(19|20)\d{2}$`;
  
    console.log('starting to search for instances');
    var foundDates = sheet.createTextFinder(regexForDate).useRegularExpression(true).findAll();
  
    // sort occurences by row, then return largest array (should eliminate erroneous dates found in other rows)
    let rowCount = {};
    // let date_columns = [];
    for (let step = 0; step < foundDates.length; step++){   
      let date = foundDates[step];
      let dateRow = date.getRow();
      console.log(date.getValue())
      console.log(date.getColumn());
  
      if (!(Object.hasOwn(rowCount, dateRow))) {
        rowCount[dateRow] = [];
      } 
  
      rowCount[dateRow].push({column: date.getColumn(), col_val: date.getValue()});
  
    }
    // find key with largest array
    var date_columns = Object.values(rowCount).sort(function compareFn(a, b){return b.length - a.length;})[0];
    console.log(date_columns);
    return date_columns;
  }
  
  // This function will parse the cell value that we're passing in and give us the label, start, and endtimes we need for our calendar event
  function parseRotaValue(rotaValue, startingDate) {
    // Calendar information
    const rotaSchedule = {
      "S": {
          label:"Regular Shift",
          start: 9,
          length: 8
          },
      "L": {
          label:"Long Shift",
          start: 8,
          length: 12.5
          },
      "N": {
          label:"Night Shift",
          start: 20,
          length: 12.5
          },
    };
  
    // one hour
    const MILLIS_PER_HOUR = 1000 * 60 * 60;
  
    if (rotaValue in rotaSchedule) {
      let eventLabel = rotaSchedule[rotaValue].label;
  
      let startTime = new Date(startingDate.getTime() + (rotaSchedule[rotaValue].start * MILLIS_PER_HOUR));
  
      let endTime = new Date(startTime.getTime() + (rotaSchedule[rotaValue].length * MILLIS_PER_HOUR));
  
      console.log(eventLabel, startTime, endTime);
      return [eventLabel, startTime, endTime];
    }
  
    return;
  
  }
  