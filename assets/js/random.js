$(document).ready(function() {
  var randomNumber = Math.round(Math.random().toFixed(2) * 100)

  $("code.random").text(">> " + randomNumber)
})
