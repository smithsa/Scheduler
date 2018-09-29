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
var months_of_year = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.' ];

//event handlers
$( document ).ready(function() {
    $('#scheduler-form').bootstrapWizard({
            nextSelector:".next",
            previousSelector: ".prev",
            onNext: function(tab, navigation, index) {
                $(".error").css('visibility', 'hidden');
                var current_step = index;
                if(current_step == 1){
                    var zipcode = $("input[name='zipcode']").val();
                    if(!isZipcodeValid(zipcode)){
                        $(".error.zipcode").text("Please enter a valid zip code.").css('visibility', 'visible');
                        return false;
                    }
                    $(".location-title").text("Available Near " + zipcode);
                    populateNearestLocations(zipcode);
                    $(".prev.btn").show();

                }
                if(current_step == 2){
                    if(!$("input[name='location']:checked").val()){
                        $(".error.locations").css('visibility', 'visible');
                        return false;
                    }
                    var location_id = $("input[name='location']:checked").attr("id");
                    var location = $('label[for='+location_id+']').html();
                    $(".selected-location").text(location.replace('<br><span class="address">', ' -').replace('</span>', '').replace("&amp;", '&'));
                }
                if(current_step == 3){
                    if(!$("input[name='date']:checked").val()){
                        $(".error.appointment").text("Please select a date.").css('visibility', 'visible');
                        return false;
                    }
                    if(!$("input[name='time']:checked").val()){
                        $(".error.appointment").text("Please select a time.").css('visibility', 'visible');
                        return false;
                    }
                    $(".submit.btn").show();
                }
            },
            onPrevious: function(tab, navigation, index) {
                var current_step = index - 1;
                if(current_step == 2){
                    $(".prev.btn").hide();
                }
                if(current_step == 4){
                    $(".submit.btn").hide();
                    $(".next.btn").show();
                }
            }
        });

    $("input[name='phone']").mask("(999) 999-9999");
    $('input, textarea').placeholder();

    $(".submit.btn").click(function(){
        $(".error").css('visibility', 'hidden');
        var is_valid = true;
        if(!$("input[name='first-name']").val()){
          $(".error.contact-information").text("Please enter first name.").css('visibility', 'visible');
            return false;
        }
        if(!$("input[name='last-name']").val()){
          $(".error.contact-information").text("Please enter last name.").css('visibility', 'visible');
            return false;
        }
        if(!$("input[name='email']").val() || !isEmailValidate($("input[name='email']").val())){
          $(".error.contact-information").text("Please enter a valid email.").css('visibility', 'visible');
            return false;
        }
        if(!$("input[name='phone']").val() || $("input[name='phone']").val().length != 14){
          $(".error.contact-information").text("Please enter a valid phone number.").css('visibility', 'visible');
            return false;
        }
        $('#scheduler-form').bootstrapWizard('show', 4);
        submitForm();
    });


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

            for (var i = 0; i < appointment_dates.length; i++){
              var day_id = appointment_dates[i].getDay();
              var numeric_date = Number(appointment_dates[i]);
              var input_id = "date-"+numeric_date;
              var input_label = days_of_week[appointment_dates[i].getDay()] + ", " + months_of_year[appointment_dates[i].getUTCMonth()] + " " + appointment_dates[i].getUTCDate()  + ", " + appointment_dates[i].getUTCFullYear();
              var input_element   = $("<input>").attr({ type: "radio", id: input_id, name: "date", value:day_id})[0];
              var label_element   = $("<label>").attr({ for: input_id}).text(input_label)[0];
              var div_element     = $("<div>").attr({ class: "date"}).append(input_element, label_element);
              $("#dates").append(div_element);
            }
         });
    });

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
    var location = $('label[for="' + location_id + '"]').html().split('<br>')[0].replace("&amp;", '&');
    var address = $('label[for="'+ location_id +'"] .address').text().slice(1);
    var date_id = $("input[name='date']:checked").attr("id");
    var dateOb = new Date(parseInt(date_id.replace('date-', '')));
    var date = $('label[for='+date_id+']').text();
    var selected_time_element = $("input[name='time']:checked");
    var time = selected_time_element.val();
    var time_list = selected_time_element.attr('id').split('-');

    var start_time_numeric = time_list[1];
    var end_time_numeric = time_list[2];

    var start_time_hour = 0;
    var start_time_minute = parseInt(start_time_numeric.slice(-2));
    if(start_time_numeric.length > 3){
      start_time_hour = parseInt(start_time_numeric.substring(0, 2));
    }else{
      start_time_hour = parseInt(start_time_numeric.substring(0, 1));
    }
    var end_time_hour = 0;
    var end_time_minute = parseInt(end_time_numeric.slice(-2));
    if(end_time_numeric.length > 3){
      end_time_hour = parseInt(end_time_numeric.substring(0, 2));;
    }else{
      end_time_hour = parseInt(end_time_numeric.substring(0, 1));;
    }
   
    var consumer_first_name = $("input[name='first-name']").val();
    var consumer_last_name = $("input[name='last-name']").val();
    var consumer_full_name = consumer_first_name + ' ' + consumer_last_name;
    var consumer_email = $("input[name='email']").val();
    var consumer_phone = $("input[name='phone']").val();
    var preferred_language = $("select[name='preferred-language']").val();
    var time_contact = $("select[name='time-for-contact']").val();
    //to get the point of contact:
    var location_data_id = $("input[name='location']:checked").val();
    var date_day_of_week = $("input[name='date']:checked").val();
    //start_time and end_time
    var selected_time_element_id_list = selected_time_element.attr("id").split('-');
    var appointment_start_time = selected_time_element_id_list[1];
    var appointment_end_time = selected_time_element_id_list[2];

    //getting the point of contact's email. will send email here.
    $.getJSON( "json/location.json", function( data ) {
        //getting the point of contact
        var selected_location = data["locations"][location_data_id];
        var time_slots = selected_location["appointment_slots"][days_of_week[date_day_of_week]]["time_slots"];
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
                var appointment_email_data = {
                    "to_email": consumer_email,
                    "to_name": consumer_full_name,
                    "appointment_date": date,
                    "appointment_time": time,
                    "appointment_location": location,
                    "appointment_address": address,
                    "appointment_poc_name": point_of_contact["first_name"] + ' ' + point_of_contact["last_name"],
                    "appointment_poc_email": point_of_contact["email"]


                };
                var navigator_email_data = {
                    "to_email": point_of_contact["email"],
                    "to_name": point_of_contact["first_name"] + ' ' + point_of_contact["last_name"],
                    "consumer_name": consumer_full_name,
                    "consumer_email": consumer_email,
                    "consumer_phone": consumer_phone,
                    "consumer_language": preferred_language,
                    "consumer_best_contact_time": time_contact,
                    "appointment_time": time,
                    "appointment_date": date,
                    "appointment_location": location,
                    "appointment_address": address,
                };

                var pic_json_data = {
                    "First Name": consumer_first_name,
                    "Last Name": consumer_last_name,
                    "Email": consumer_email,
                    "Phone Number": consumer_phone.replace(/\D/g,''),
                    "Preferred Language": preferred_language,
                    "Best Contact Time": time_contact,
                    "Appointment": {"Name": selected_location['name'],
                                                "Street Address": selected_location['street_address'],
                                                "City": selected_location['city'],
                                                "State": selected_location['state'],
                                                "Zip Code": selected_location['zip_code'],
                                                "Phone Number": selected_location['phone'].replace(/\D/g,''),
                                                "Appointment Slot": {"Date": {"Day": dateOb.getUTCDate(),
                                                                              "Month": parseInt(dateOb.getUTCMonth()) + 1,
                                                                              "Year": dateOb.getUTCFullYear()},
                                                                     "Start Time": {"Hour": start_time_hour, "Minutes": start_time_minute},
                                                                     "End Time": {"Hour": end_time_hour, "Minutes": end_time_minute}},
                                                "Point of Contact": {"First Name": point_of_contact["first_name"],
                                                                      "Last Name": point_of_contact["last_name"],
                                                                     "Email": point_of_contact["email"],
                                                                     "Type": point_of_contact["type"]}
                                                }
                };

                // sendConsumerEmail(appointment_email_data);
                // sendNavigatorEmail(navigator_email_data);
                log_pic_data(pic_json_data);
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

function log_pic_data(data){
    data = JSON.stringify(data);
    $.ajax({
        type: "POST",
        url: "http://obscure-harbor-6074.herokuapp.com/submitappointment/",
        data: data,
        crossDomain : true,
        dataType: 'json'
    });
}

function sendNavigatorEmail(data){
    var params = {
        "key": "0LcbsIutlKO5QcqjGKl5tA",
        "template_name": "Scheduler Request: Navigator",
        "template_content": [
            {
                "name": "appointment_date",
                "content": data['appointment_date']
            },
            {
                "name": "appointment_time",
                "content": data['appointment_time']
            },
            {
                "name": "appointment_location",
                "content": data['appointment_location']
            },
            {
                "name": "navigator_name",
                "content": data['to_name']
            },
            {
                "name": "consumer_name",
                "content": data['consumer_name']
            },
            {
                "name": "consumer_phone",
                "content": data['consumer_phone']
            },
            {
                "name": "consumer_email",
                "content": data['consumer_email']
            },
            {
                "name": "consumer_language",
                "content": data['consumer_language']
            },
            {
                "name": "consumer_best_contact_time",
                "content": data['consumer_best_contact_time']
            }
        ],
        "message": {
            "subject": "Request For Meeting: Presence Health",
            "from_email": "admin@patientinnovationcenter.org",
            "from_name": "Patient Innovation Center",
            "to": [
                {
                    "email": data['to_email'],
                    "name": data['to_name'],
                    "type": "to"
                }
            ],
            "headers": {
                "Reply-To": " no-reply@patientinnovationcenter.org"
            }
        }
    };

    $.ajax({
        type: "Post",
        url: "https://mandrillapp.com/api/1.0/messages/send-template.json",
        data: params
    });

}

function sendConsumerEmail(data){
    var params = {
        "key": "",
        "template_name": "Scheduler Request: Consumer",
        "template_content": [
            {
                "name": "consumer_name",
                "content": data['to_name']
            },
            {
                "name": "appointment_date",
                "content": data['appointment_date']
            },
            {
                "name": "appointment_time",
                "content": data['appointment_time']
            },
            {
                "name": "appointment_location",
                "content": data['appointment_location']
            },
            {
                "name": "appointment_address",
                "content": data['appointment_address']
            },
            {
                "name": "appointment_poc_name",
                "content": data['appointment_poc_name']
            },
            {
                "name": "appointment_poc_email",
                "content": data['appointment_poc_email']
            }
        ],
        "message": {
            "subject": "Navigator Request Confirmation",
            "from_email": "admin@patientinnovationcenter.org",
            "from_name": "Patient Innovation Center",
            "to": [
                {
                    "email": data['to_email'],
                    "name": data['to_name'],
                    "type": "to"
                }
            ],
            "headers": {
                "Reply-To": " no-reply@patientinnovationcenter.org"
            }
        }
    };

    $.ajax({
        type: "Post",
        url: "https://mandrillapp.com/api/1.0/messages/send-template.json",
        data: params
    });

}