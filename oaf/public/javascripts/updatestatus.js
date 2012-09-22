function UpdateTelescopeStatus(teleStatus, widget) {
  if (teleStatus.Power == 0.0) {
    widget.text("off");
    widget.css('background-color', 'white');
    widget.css('color', 'black');
  } else {
    if (teleStatus.Power >= 0.0 && teleStatus.Power < 1.0) {
      widget.text("Operational (Standby)");
      widget.css('background-color', 'white');
    } else if (teleStatus.Power == 1.0) {
      if (teleStatus.Referenced >= 0.0 && teleStatus.Referenced <= 1.0) {
        widget.text("Referencing");
        widget.css('background-color', 'yellow');
      }
      if (teleStatus.Referenced == 1.0) {
        widget.text("Operational");
        widget.css('background-color', 'green');
        widget.css('color', 'white');
      }
    }
  }
  if (teleStatus.Globalstatus != 0.0) {
    widget.text("Operational (Error)");
    widget.css('background-color', 'red');
    widget.css('color', 'white');
  }
  if (teleStatus.Power == -1.0) {
    widget.text("Emergency Off");
    widget.css('background-color', 'yellow');
    widget.css('color', 'red');
  }
}
