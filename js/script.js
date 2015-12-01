
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


//initial load of the locations
$.getJSON( "json/location.json", function( data ) {
    data = data['locations'];
    for(var key in data){
      var location_id     = data[key]['id'];
      var location_name   = data[key]['name'];
      var location_street = data[key]['street_address'];
      var location_city   = data[key]['city'];
      var location_state  = data[key]['state'];
      var input_id        = 'location-'+location_id;
      var input_label     = location_name + location_street + location_city + location_state;
      var input_element   = $('<input>').attr({ type: 'radio', id: input_id, name: 'location', value:location_id})[0];
      var label_element   = $('<label>').attr({ for: input_id}).text(input_label)[0];
      var div_element     = $('<div>').attr({ class: 'location'}).append(input_element, label_element);
      $("#locations").append(div_element);
    }
});

//event handlers
$( document ).ready(function() {
    $("#scheduler-form").easyWizard({showSteps: false, showButtons:false});
    $("input[name='phone']").mask("(999) 999-9999");

    $(".next.btn").click(function(){
         $(".error").hide();
         var current_step = $(".step.active").attr("data-step");
         if(current_step == 2){
            if(!$("input[name='location']:checked").val()){
              $(".error.locations").show();
              return false;
            }
            $(".prev.btn").show();
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
      $('#scheduler-form').easyWizard('prevStep');
       if(current_step == 3){
          $(".prev.btn").hide();
       }
       if(current_step == 4){
          $(".submit.btn").hide();
          $(".next.btn").show();
       }
    });

    $(".submit.btn").click(function(){
        $(".error").hide();
        if(!$("input[name='full-name']").val()){
          $(".error.full-name").show();
        }
        if(!$("input[name='email']").val() || !validateEmail($("input[name='email']").val())){
          $(".error.email").show();
        }
        if(!$("input[name='phone']").val() || $("input[name='phone']").val().length != 14){
          $(".error.phone").show();
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

            appointment_days_of_week = [];
            for(var key in data){
              appointment_days_of_week.push(day_of_week_codes[key]);
            }

            var appointment_dates = getAppointmentDates(start_date, max_days, appointment_days_of_week);
            var date_options = {
                weekday: "long", 
                year: "numeric", 
                month: "long",
                day: "numeric",
            }

            for (var i = 0; i < appointment_dates.length; i++){
              var day_id = appointment_dates[i].getDay();
              var input_id = "date-"+day_id;
              var numeric_date = Number(appointment_dates[i]);
              var list_date = appointment_dates[i].toLocaleTimeString("en-us", date_options).split(",");
              var input_label = list_date[0] + ', ' + list_date[1] + ', ' + list_date[2];
              var input_element   = $('<input>').attr({ type: 'radio', id: input_id, name: 'date', value:day_id})[0];
              var label_element   = $('<label>').attr({ for: input_id}).text(input_label)[0];
              var div_element     = $('<div>').attr({ class: 'date'}).append(input_element, label_element);
              $("#dates").append(div_element);
            }
         });
    });

    //event handler for the date
    $("#dates").on("click", "input[name='date']", function(){
      $("#times").empty();
      var day_code = parseInt($(this).val());
      var day_of_week = days_of_week[day_code]
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
              var input_id = 'time-'+start_military_time;
              var input_element   = $('<input>').attr({ type: 'radio', id:input_id  , name: 'time', value:time_range})[0];
              var label_element   = $('<label>').attr({ for: input_id}).text(time_range)[0];
              var div_element     = $('<div>').attr({ class: 'date'}).append(input_element, label_element);
              $("#times").append(div_element);
            }
      });
    });

});

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
    var location = $("input[name='location']:checked").text();
    var date = $("input[name='date']:checked").text();
    var time = $("input[name='time']").val();
    var full_name = $("input[name='full-name']").val();
    var email = $("input[name='email']").val();
    var phone = $("input[name='phone']").val();
    console.log(location);
    console.log(date);
    console.log(time);
    console.log(full_name);
    console.log(email);
    console.log(phone);
}


function validateEmail(value){
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

$.fn.serializeObject = function () {
    "use strict";
    var result = {};
    var extend = function (i, element) {
      var node = result[element.name];
      // If node with same name exists already, need to convert it to an array as it
      // is a multi-value field (i.e., checkboxes)
      if ('undefined' !== typeof node && node !== null) {
        if ($.isArray(node)) {
          node.push(element.value);
        } else {
          result[element.name] = [node, element.value];
        }
      } else {
        result[element.name] = element.value;
      }
    };

    $.each(this.serializeArray(), extend);
    return result;
  }