'use strict';

$(document).ready(function(){
    $('#update-form').hide();
    $('#updateBtn').on("click", function(){
    $("#update-form").toggle()
    })
});

prompt("hello are you there");