// This module is added in order to use third-party library d3.js in stand-alone html page.
// Module is used only in publishing and returns global object d3 which is defined when d3.min.js is loaded.
define('Vendors/d3.min', function() {
	return window.d3;
});
