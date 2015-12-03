//notes
// narrow down the closest 6 locations and display those

var config = {}

//references
var day_of_week_codes = {
  "Sunday":0,
  "Monday":1,
  "Tuesday":2,
  "Wednesday":3,
  "Thursday":4,
  "Friday":5,
  "Saturday":6
}

var days_of_week = Object.keys(day_of_week_codes);

//event handlers
$( document ).ready(function() {
    $("#scheduler-form").easyWizard({showSteps: false, showButtons:false});
    $("input[name='phone']").mask("(999) 999-9999");

    $(".next.btn").click(function(){
         $(".error").hide();
         var current_step = $(".step.active").attr("data-step");
         var next_step =  parseInt(current_step) + 1;
         if(current_step == 1){
             var zipcode = $("input[name='zipcode']").val();
             if(!isZipcodeValid(zipcode)){
                 $(".error.zipcode").show();
                 return false;
             }
             $(".location-title").text("Available Near "+zipcode);
             populateNearestLocations(zipcode);
             $(".prev.btn").show();

         }
         if(current_step == 2){
            if(!$("input[name='location']:checked").val()){
              $(".error.locations").show();
              return false;
            }
            var location_id = $("input[name='location']:checked").attr("id");
            var location = $('label[for='+location_id+']').html();
            $(".selected-location").text(location.replace('<br><span class="address">', '-').replace('</span>', '').replace("&amp;", '&'));
         }
         if(current_step == 3){
           if(!$("input[name='date']:checked").val()){
              $(".error.dates").show();
              return false;
           }
           if(!$("input[name='time']:checked").val()){
              $(".error.times").show();
              return false;
           }
            $(".submit.btn").show();
            $(".next.btn").hide();
         }


         $('#scheduler-form').easyWizard('nextStep');


    });

    $(".prev.btn").click(function(){
      var current_step = $(".step.active").attr("data-step");
      var prev_step =  parseInt(current_step) - 1;
      $('#scheduler-form').easyWizard('prevStep');

       if(current_step == 2){
          $(".prev.btn").hide();
       }
       if(current_step == 4){
          $(".submit.btn").hide();
          $(".next.btn").show();
       }
    });

    $(".submit.btn").click(function(){
        $(".error").hide();
        var is_valid = true;
        if(!$("input[name='full-name']").val()){
          $(".error.full-name").show();
            is_valid = false;
        }
        if(!$("input[name='email']").val() || !isEmailValidate($("input[name='email']").val())){
          $(".error.email").show();
            is_valid = false;
        }
        if(!$("input[name='phone']").val() || $("input[name='phone']").val().length != 14){
          $(".error.phone").show();
            is_valid =  false;
        }
        if(!is_valid){
            return false;
        }

        submitForm();
    });

    

    //for this event handler, for every click I am making an ajax call to the server, this needs to change
    //event handler for the location
    $("#locations").on("click", "input[name='location']", function(){
        $("#dates, #times").empty();
         var location_id = $(this).val();
         $.getJSON( "json/location.json", function( data ) {
            data = data['locations'][location_id]['appointment_slots'];

            //configuring settings
            var max_days = 10;
            var buffer_start_days = 3;

            var start_date = new Date();
            start_date = addBusinessDays(start_date, buffer_start_days);

            var appointment_days_of_week = [];
            for(var key in data){
              appointment_days_of_week.push(day_of_week_codes[key]);
            }

            var appointment_dates = getAppointmentDates(start_date, max_days, appointment_days_of_week);
            var date_options = {
                weekday: "long", 
                year: "numeric", 
                month: "short",
                day: "numeric",
            }

            for (var i = 0; i < appointment_dates.length; i++){
              var day_id = appointment_dates[i].getDay();
              var numeric_date = Number(appointment_dates[i]);
              var input_id = "date-"+numeric_date;
              var list_date = appointment_dates[i].toLocaleTimeString("en-us", date_options).split(",");
              var input_label = list_date[0] + ", " + list_date[1] + ", " + list_date[2];
              var input_element   = $("<input>").attr({ type: "radio", id: input_id, name: "date", value:day_id})[0];
              var label_element   = $("<label>").attr({ for: input_id}).text(input_label)[0];
              var div_element     = $("<div>").attr({ class: "date"}).append(input_element, label_element);
              $("#dates").append(div_element);
            }
         });
    });

    //event handler for the date
    $("#dates").on("click", "input[name='date']", function(){
      $("#times").empty();
      var day_code = parseInt($(this).val());
      var day_of_week = days_of_week[day_code];
      $.getJSON( "json/location.json", function( data ) {
            var location_id = $("input[name=location]:checked").val();
            data = data['locations'][location_id]['appointment_slots'];
            var  times = data[day_of_week]['time_slots'];
            var day_time_slots = getTimeSlots(times, 1);
            for (var i = 0; i < day_time_slots.length; i++){
              var start_military_time = day_time_slots[i][0];
              var end_military_time = day_time_slots[i][1];
              var start_standard_time = militaryToStandard(start_military_time);
              var end_standard_time = militaryToStandard(end_military_time);
              var time_range = start_standard_time + ' - ' + end_standard_time;
              var input_id = 'time-' + start_military_time + '-' + end_military_time;
              var input_element   = $('<input>').attr({ type: 'radio', id:input_id  , name: 'time', value:time_range})[0];
              var label_element   = $('<label>').attr({ for: input_id}).text(time_range)[0];
              var div_element     = $('<div>').attr({ class: 'time'}).append(input_element, label_element);
              $("#times").append(div_element);
            }
      });
    });

});

function populateNearestLocations(zipcode){
    $("#locations").empty();

    //initial load of the locations
    $.getJSON( "json/location.json", function( data ) {
        var data = data["locations"];
        var nearest_locations = [];
        for(var key in data){
            var distance = Math.abs(zipcode - parseInt(data[key]['zip_code']));
            nearest_locations.push([distance, data[key]]);
        }
        //sorting the locations to find the nearest
        nearest_locations.sort(sortMultiDimensionalArray);
        if(nearest_locations.length > 6){
            nearest_locations = nearest_locations.splice(0,6);
        }

        //populating locations
        for(var key in nearest_locations){
            var location_id     = nearest_locations[key][1]['id'];
            var location_name   = nearest_locations[key][1]['name'];
            var location_street = nearest_locations[key][1]['street_address'];
            var location_city   = nearest_locations[key][1]['city'];
            var location_state  = nearest_locations[key][1]['state'];
            var location_zipcode  = nearest_locations[key][1]['zip_code'];
            var input_id        = 'location-'+location_id;
            var input_label     = location_name + '<br/><span class="address"> ' + location_street + ', ' + location_city + ', ' + location_state + ' ' + location_zipcode + '</span>';
            var input_element   = $('<input>').attr({ type: 'radio', id: input_id, name: 'location', value:location_id})[0];
            var label_element   = $('<label>').attr({ for: input_id}).html(input_label)[0];
            var div_element     = $('<div>').attr({ class: 'location'}).append(input_element, label_element);
            $("#locations").append(div_element);
        }
    });
}

//get times slots, currently works well for increments of 1, haven't tested for more hour increments
function getTimeSlots(time_slots, hour_increment){
  //getting the lowest start time and the highest end time
  var lowest_start_time = 100000;
  var highest_end_time = -10000;
  for(var i = 0; i < time_slots.length; i++){
    if(time_slots[i]['start_time'] < lowest_start_time){
        lowest_start_time = time_slots[i]['start_time'];

    }
    if(time_slots[i]['end_time'] > highest_end_time){
        highest_end_time = time_slots[i]['end_time'];
    }
  }
  var day_time_slots = [];
  var time_increment = hour_increment * 100;
  while(true){
    var end_time = lowest_start_time+time_increment;
    if(end_time >= highest_end_time){
      end_time = highest_end_time;
      day_time_slots.push([lowest_start_time, end_time]);
      break;
    }else{
      day_time_slots.push([lowest_start_time, end_time]);
    }
    lowest_start_time = lowest_start_time + time_increment;
  }
  return day_time_slots;
}

//get valid days for appointment slots
function getAppointmentDates(start_date, max_days, valid_days){
    var appointment_dates = [];
    var day_counter = 0;
    while(true){
      if(start_date.getDay() > 0 && start_date.getDay() <= 5){
        if( $.inArray(start_date.getDay(), valid_days) != -1){
          var new_date = new Date(start_date);
          appointment_dates.push(new_date);
        }
        day_counter += 1;
        if(day_counter == max_days){ return appointment_dates;}
      }
      start_date.setDate(start_date.getDate() + 1);
    }
}

//add business days
function addBusinessDays(date, days){
  var day_counter = 0;
  while(true){
    date.setDate(date.getDate() + 1);
    if(date.getDay() > 0 && date.getDay() <= 5){
      day_counter += 1;
      if(day_counter == days){ return date;}
    }
  }
}

function submitForm(){
    var location_id = $("input[name='location']:checked").attr("id");
    var location = $('label[for='+location_id+']').text();
    var date_id = $("input[name='date']:checked").attr("id");
    var date = $('label[for='+date_id+']').text();
    var selected_time_element = $("input[name='time']:checked");
    var time = selected_time_element.val();
    var consumer_full_name = $("input[name='full-name']").val();
    var consumer_email = $("input[name='email']").val();
    var consumer_phone = $("input[name='phone']").val();
    //to get the point of contact:
    // 1. location id is needed = location_id;
    var location_data_id = $("input[name='location']:checked").val();
    // 2. day of week
    var date_day_of_week = $("input[name='date']:checked").val();
    // 3. time slot
    //start_time and end_time
    var selected_time_element_id_list = selected_time_element.attr("id").split('-');
    var appointment_start_time = selected_time_element_id_list[1];
    var appointment_end_time = selected_time_element_id_list[2];

    console.log(location);
    console.log(date);
    console.log(time);
    console.log(consumer_full_name);
    console.log(consumer_email);
    console.log(consumer_phone);
    console.log('location id:', location_data_id);
    console.log('day of week id:', date_day_of_week);
    console.log('start time:', appointment_start_time);
    console.log('end time:', appointment_end_time);

    //getting the point of contact's email. will send email here.
    $.getJSON( "json/location.json", function( data ) {
        //getting the point of contact
        var time_slots = data["locations"][location_data_id]["appointment_slots"][days_of_week[date_day_of_week]]["time_slots"];
        var points_of_contacts = [];
        for(var i = 0; i < time_slots.length; i++){
            if(appointment_start_time >= time_slots[i]["start_time"] && appointment_end_time <= time_slots[i]["end_time"]){
                var current_point_of_contacts = time_slots[i]["point_of_contact"];
                points_of_contacts = points_of_contacts.concat(current_point_of_contacts);
            }
        }

        //choosing a contact randomly if more than one contact is currently at that location
        var point_of_contact_id = points_of_contacts[0];
        if(points_of_contacts.length > 1){
            point_of_contact_id = points_of_contacts[Math.floor(Math.random() * points_of_contacts.length)];
        }

        $.getJSON( "json/point_of_contact.json", function( data ) {
                var point_of_contact = data["point_of_contacts"][point_of_contact_id];
                console.log("poc:", point_of_contact["email"]);
        });

    });
}

function isZipcodeValid(value){
    if (/(^\d{5}$)|(^\d{5}-\d{4}$)/.test(value)){
        return true;
    }
    return false;
}

function isEmailValidate(value){
 if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(value)){
    return true;
  }
  return false;
}

function militaryToStandard(value) {
  if (value !== null && value !== undefined){ 
        var hour = "";
        var minutes = "";
        value = value.toString();
        if(value.length == 3){ 
          hour = value.substring ( 0,1 ); 
          minutes = value.substring ( 1,3 ); 
        }else{
          hour = value.substring ( 0,2 ); 
          minutes = value.substring ( 2,4 ); 
        }
         
        var identifier = 'AM'; 
 
        if(hour == 12){ 
          identifier = 'PM';
        }
        if(hour == 0){ 
          hour=12;
        }
        if(hour > 12){ 
          hour = hour - 12;
          identifier='PM';
        }
        return hour + ':' + minutes + ' ' + identifier; 
      }
      else { 
        return value;
      }
}
function sortMultiDimensionalArray(a, b) {
    if (a[0] === b[0]) {
        return 0;
    }
    else {
        return (a[0] < b[0]) ? -1 : 1;
    }
}
//function to send email
function sendMail(){
  $.ajax({
    type: "POST",
    url: "https://mandrillapp.com/api/1.0/messages/send.json",
    data: {
      'key': 'YOUR_KEY',
      'message': {
        'from_email': 'YOUR_SENDER@example.com',
        'to': [
          {
            'email': 'YOUR_RECEIVER@example.com',
            'name': 'YOUR_RECEIVER_NAME',
            'type': 'to'
          }
        ],
        'subject': 'title',
        'html': 'html can be used'
      }
    }
  });
}
