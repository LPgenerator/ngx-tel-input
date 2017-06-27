import data from './countries';
import { parse, format, asYouType, isValidNumber } from 'libphonenumber-js';
const allCountries: any = data;
const intlTelInputUtils: any = false;


// these vars persist through all instances of the plugin
let pluginName = "intlTelInput",
	id = 0, // give each instance it's own id for calling some methods on all instances
	defaults = {
		// typing digits after a valid number will be added to the extension part of the number
		allowExtensions: false,
		// automatically format the number according to the selected country
		autoFormat: true,
		// if there is just a dial code in the input: remove it on blur, and re-add it on focus
		autoHideDialCode: true,
		// add or remove input placeholder with an example number for the selected country
		autoPlaceholder: true,
		// default country
		defaultCountry: "",
		// geoIp lookup function
		geoIpLookup: null,
		// don't insert international dial codes
		nationalMode: true,
		// number type to use for placeholders
		numberType: "MOBILE",
		// display only these countries
		onlyCountries: [],
		// the countries at the top of the list. defaults to united states and united kingdom
		preferredCountries: ["RU", "PL"],
		// specify the path to the libphonenumber script to enable validation/formatting
		utilsScript: ""
	},
	keys = {
		UP: 38,
		DOWN: 40,
		ENTER: 13,
		ESC: 27,
		PLUS: 43,
		A: 65,
		Z: 90,
		ZERO: 48,
		NINE: 57,
		SPACE: 32,
		BSPACE: 8,
		TAB: 9,
		DEL: 46,
		CTRL: 17,
		CMD1: 91, // Chrome
		CMD2: 224 // FF
	},
	windowLoaded = false,
	allInstances = [];

function inArray(value, array) {

	for (let i = 0; i < array.length; i++) {

		if (array[i] === value) { return i; }
	}

	return -1;
}

function trim(text) {
	if (text) { return (text + "").replace(/\s/g, ""); }
	else      { return "";                                                            }
}

function hasClass(element, className) {
	return element.classList.contains(className);
}

function removeClass(element, className) {
	element.classList.remove(className);
}

function addClass(element, className) {
	element.classList.add(className);
}

function whichKey(e) {

	if (e.which) { return e.which;                                                                    }
	else         { return (e.charCode !== null && e.charCode !== undefined) ? e.charCode : e.keyCode; }
}

function isNumeric(string) {

	return (string - parseFloat(string) + 1) >= 0;
}

function getWindowScrollTop() {

	let supportPageOffset = (<any>window).pageYOffset !== undefined;
	let isCSS1Compat = ((document.compatMode || "") === "CSS1Compat");

	if      (supportPageOffset) { return (<any>window).pageYOffset;                 }
	else if (isCSS1Compat)      { return document.documentElement.scrollTop; }
	else                        { return document.body.scrollTop;            }
}

function getWindowInnerHeight() {

	if ((<any>window).innerHeight === undefined) { return document.documentElement.clientHeight; }
	else                                  { return (<any>window).innerHeight;                    }
}

function forEach(elements, fn) {
	elements.forEach(fn);
}

function first(elements, fn) {
	for (let i = 0; i < elements.length; i++) {
		let element = elements[i];
		if (fn(element)) { return element; }
	}
}

function hasFocus(element) {

	return element.parentNode && element.parentNode.querySelector(":focus") === element;
}

// tagName is lowercased
function getClosestParent(element, tagName) {
	if      (element.tagName && element.tagName.toLowerCase() === tagName) { return element; }
	else if (element.parentNode) { return getClosestParent(element.parentNode, tagName); }
	else { return null; }
}

function dispatchEvent(element, eventName, bubbles, cancellable) {
	if (document.createEvent) {
		let event = document.createEvent("HTMLEvents");
		event.initEvent(eventName, bubbles, cancellable);
		element.dispatchEvent(event);
	}
	else if (element.fireEvent) { element.fireEvent("on" + eventName); }
	else                        { throw new Error("-_-");              }
}

function dispatchCustomEvent(element, eventName, bubbles, cancellable, data?) {

	if ((<any>window).CustomEvent || document.createEvent) {
		let event;
		if ((<any>window).CustomEvent) {
			event = new CustomEvent(eventName, data);
		}
		else if (document.createEvent) {
			event = document.createEvent("CustomEvent");
			event.initCustomEvent(eventName, bubbles, cancellable, data);
		}

		return element.dispatchEvent(event);
	}
}

function createHandler(element, fn?) {

	if      (element.addEventListener) { return fn; }
	else if (element.attachEvent) {
		return function(event) {
			fn.call(element, event);
		};
	}
	else { throw new Error("-_-"); }
}

function addEventListener(element, eventName, handler) {
	if      (element.addEventListener) { element.addEventListener(eventName, handler, false); }
	else if (element.attachEvent)      { element.attachEvent('on' + eventName, handler);      }
	else                               { throw new Error("-_-");                              }
}

function removeEventListener(element, eventName, handler) {
	if      (element.removeEventListener) { element.removeEventListener(eventName, handler, false); }
	else if (element.detachEvent)         { element.detachEvent('on' + eventName, handler);         }
	else                                  { throw new Error("-_-");                                 }
}

function stopPropagation(event) {
	if (event.stopPropagation) { event.stopPropagation();   }
	else                       { event.cancelBubble = true; }
}

function preventDefault(event) {
	if (event.preventDefault) { event.preventDefault();    }
	else                      { event.returnValue = false; }
}

function getOffset(element) {
	let rect = element.getBoundingClientRect();

	return {
		top: rect.top + document.body.scrollTop,
		left: rect.left + document.body.scrollLeft
	};
}

let storage = {

	get: function(key) {

		if      ((<any>window).localStorage) { return (<any>window).localStorage.getItem(key); }
		else                          { return "";                               }
	},

	set: function(key, value, options) {

		if      ((<any>window).localStorage) { return (<any>window).localStorage.setItem(key, value); }
	}
};
// keep track of if the window.load event has fired as impossible to check after the fact
addEventListener((<any>window), "load", function () { windowLoaded = true; });

let methods = {
	getListItemByCode: function(countryList, countryCode) {
		// unfortunately IE8 doesn't support :not css selector -_-
		let listItems = countryList.querySelectorAll("[data-country-code=" + countryCode + "]");
		let listItem = first(listItems, function(item) { return !hasClass(item, "preferred"); });

		return listItem;
	},
	getDropdownHeight: function(countryList) {

		let height;

		countryList.className = "country-list v-hide";
		height = countryList.offsetHeight;
		countryList.className = "country-list hide";

		return height;
	},
	generateMarkup: function(isMobile, anyPreferredCountries) {

		let selectedFlagInner = document.createElement("div");
		let flagsContainer = document.createElement("div");
		let mainContainer = document.createElement("div");
		let selectedFlag = document.createElement("div");
		let arrow = document.createElement("div");
		let countryList;
		let divider;

		selectedFlagInner.className = "iti-flag";
		flagsContainer.className = "flag-dropdown";
		mainContainer.className = "intl-tel-input";
		selectedFlag.className = "selected-flag";
		arrow.className = "arrow";

		// make element focusable and tab naviagable
		selectedFlag.tabIndex = 0;

		// country list
		// mobile is just a native select element
		// desktop is a proper list containing: preferred countries, then divider, then all countries
		if (isMobile) {
			countryList = document.createElement("select");
			countryList.className = "iti-mobile-select";
		} else {
			countryList = document.createElement("ul");
			countryList.className = "country-list hide";

			if (anyPreferredCountries) {
				divider = document.createElement("li");
				divider.className = "divider";
			}
		}

		// must do it this way instead of using a literal syntax, otherwise the min version will have a syntax error
		let ret: any = {};
		ret.selectedFlagInner = selectedFlagInner;
		ret.flagsContainer = flagsContainer;
		ret.mainContainer = mainContainer;
		ret.selectedFlag = selectedFlag;
		ret.countryList = countryList;
		ret.divider = divider;
		ret.arrow = arrow;

		return ret;
	},
	restructureMarkup: function(element, markup) {

		let selectedFlagInner = markup.selectedFlagInner;
		let flagsContainer = markup.flagsContainer;
		let mainContainer = markup.mainContainer;
		let selectedFlag = markup.selectedFlag;
		let countryList = markup.countryList;
		let arrow = markup.arrow;

		// This check is necessary since this element may have been created without a parent using Javascript
		if (element.parentNode) { element.parentNode.insertBefore(mainContainer, element); }

		mainContainer.appendChild(element);
		mainContainer.insertBefore(flagsContainer, element);

		// currently selected flag (displayed to left of input)
		flagsContainer.appendChild(selectedFlag);

		selectedFlag.appendChild(selectedFlagInner);
		selectedFlag.appendChild(arrow);

		// country list
		// mobile is just a native select element
		// desktop is a proper list containing: preferred countries, then divider, then all countries
		flagsContainer.appendChild(countryList);
	}
};

let IntlTelInput: any = function (element, options) {

	let instance = this.instance = new Plugin(element, options || {});
	this.inputElement = element;

	instance._init();
}

// get the country data object
IntlTelInput.getCountryData = function() { return allCountries; };
IntlTelInput.version = "<%= version %>";

IntlTelInput.prototype = {

	selectCountry: function(countryCode) { return this.instance.selectCountry(countryCode); },

	getSelectedCountryData: function() { return this.instance.getSelectedCountryData(); },

	setNumber: function(number, format, addSuffix, preventConversion, isAllowedKey) {
		return this.instance.setNumber(number, format, addSuffix, preventConversion, isAllowedKey);
	},

	getValidationError: function() { return this.instance.getValidationError(); },

	autoCountryLoaded: function() { return this.instance.autoCountryLoaded(); },

	isValidNumber: function() { return this.instance.isValidNumber(); },

	getNumber: function(type) { return this.instance.getNumber(type); },

	getNumberType: function() { return this.instance.getNumberType(); },

	getExtension: function() { return this.instance.getExtension(); },

	getFormatNumber: function () { return this.instance.getFormatNumber(); },

	getPlaintextNumber: function () { return this.instance.getPlaintextNumber(); },

	utilsLoaded: function() { return this.instance.utilsLoaded(); },

	destroy: function() { return this.instance.destroy(); }
};


function Plugin(element, options) {
	this.element = element;

	this.options = Object.assign(defaults, options);

	this._defaults = defaults;

	// unique identifier for this instance
	allInstances[id] = this;
	this.id = id;
	id++;

	// Chrome, FF, Safari, IE9+
	this.isGoodBrowser = Boolean(element.setSelectionRange);
	this.hadInitialPlaceholder = element.hasAttribute("placeholder");

	this._name = pluginName;

	// For some reason tests fail when this line is omitted
}

Plugin.prototype = {

	_init: function() {
		// if in nationalMode, disable options relating to dial codes
		if (this.options.nationalMode) {
			this.options.autoHideDialCode = false;
		}
		// IE Mobile doesn't support the keypress event (see issue 68) which makes autoFormat impossible
		if (navigator.userAgent.match(/IEMobile/i)) {
			this.options.autoFormat = false;
		}

		// we cannot just test screen size as some smartphones/website meta tags will report desktop resolutions
		// Note: for some reason jasmine fucks up if you put this in the main Plugin function with the rest of these declarations
		// Note: to target Android Mobiles (and not Tablets), we must find "Android" and "Mobile"
		this.isMobile = /Android.+Mobile|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

		// process all the data: onlyCountries, preferredCountries etc
		this._processCountryData();

		// generate the markup
		this._generateMarkup(this.isMobile, this.element, this.countries, this.preferredCountries);

		// set the initial state of the input value and the selected flag
		this._setInitialState();

		// start all of the event listeners: autoHideDialCode, input keydown, selectedFlag click
		this._initListeners();

		// utils script, and auto country
		this._initRequests();

	},



	/********************
	 *  PRIVATE METHODS
	 ********************/


	// prepare all of the country data, including onlyCountries and preferredCountries options
	_processCountryData: function() {
		// set the instances country data objects
		this._setInstanceCountryData();

		// set the preferredCountries property
		this._setPreferredCountries();
	},


	// add a country code to this.countryCodes
	_addCountryCode: function(iso2, dialCode, priority) {
		if (!(dialCode in this.countryCodes)) {
			this.countryCodes[dialCode] = [];
		}
		let index = priority || 0;
		this.countryCodes[dialCode][index] = iso2;
	},


	// process onlyCountries array if present, and generate the countryCodes map
	_setInstanceCountryData: function() {
		let i;

		// process onlyCountries option
		if (this.options.onlyCountries.length) {
			// standardise case
			for (i = 0; i < this.options.onlyCountries.length; i++) {
				this.options.onlyCountries[i] = this.options.onlyCountries[i].toLowerCase();
			}
			// build instance country array
			this.countries = [];
			for (i = 0; i < allCountries.length; i++) {
				if (inArray(allCountries[i].iso2, this.options.onlyCountries) != -1) {
					this.countries.push(allCountries[i]);
				}
			}
		} else {
			this.countries = allCountries;
		}

		// generate countryCodes map
		this.countryCodes = {};
		for (i = 0; i < this.countries.length; i++) {
			let c = this.countries[i];
			this._addCountryCode(c.iso2, c.dialCode, c.priority);
			// area codes
			if (c.areaCodes) {
				for (let j = 0; j < c.areaCodes.length; j++) {
					// full dial code is country code + dial code
					this._addCountryCode(c.iso2, c.dialCode + c.areaCodes[j]);
				}
			}
		}
	},


	// process preferred countries - iterate through the preferences,
	// fetching the country data for each one
	_setPreferredCountries: function() {
		this.preferredCountries = [];
		for (let i = 0; i < this.options.preferredCountries.length; i++) {
			let countryCode = this.options.preferredCountries[i].toLowerCase(),
				countryData = this._getCountryData(countryCode, false, true);
			if (countryData) {
				this.preferredCountries.push(countryData);
			}
		}
	},


	// generate all of the markup for the plugin: the selected flag overlay, and the dropdown
	_generateMarkup: function(isMobile, element, countries, preferredCountries) {

		let markup = methods.generateMarkup(isMobile, preferredCountries.length);

		methods.restructureMarkup(element, markup);

		// prevent autocomplete as there's no safe, cross-browser event we can react to, so it can easily put the plugin in an inconsistent state e.g. the wrong flag selected for the autocompleted number, which on submit could mean the wrong number is saved (esp in nationalMode)
		element.setAttribute("autocomplete", "off");

		this.selectedFlagInner = markup.selectedFlagInner;
		this.flagsContainer = markup.flagsContainer;
		this.selectedFlag = markup.selectedFlag;
		this.countryList = markup.countryList;
		this.arrow = markup.arrow;

		if (preferredCountries.length && !isMobile) {
			this._appendListItems(preferredCountries, "preferred");

			this.countryList.appendChild(markup.divider);
		}

		this._appendListItems(countries, "");

		if (!isMobile) {
			// now we can grab the dropdown height, and hide it properly
			this.dropdownHeight = methods.getDropdownHeight(this.countryList);

			// this is useful in lots of places
			this.countryListItems = this.countryList.querySelectorAll(".country");
		}
	},


	// add a country <li> to the countryList <ul> container
	// UPDATE: if isMobile, add an <option> to the countryList <select> container
	_appendListItems: function(countries, className) {
		// we create so many DOM elements, it is faster to build a temp string
		// and then add everything to the DOM in one go at the end
		let tmp = "";
		// for each country
		for (let i = 0; i < countries.length; i++) {
			let c = countries[i];
			if (this.isMobile) {
				tmp += "<option data-dial-code='" + c.dialCode + "' value='" + c.iso2 + "'>";
				tmp += c.name + " +" + c.dialCode;
				tmp += "</option>";
			} else {
				// open the list item
				tmp += "<li class='country " + className + "' data-dial-code='" + c.dialCode + "' data-country-code='" + c.iso2 + "'>";
				// add the flag
				tmp += "<div class='flag'><div class='iti-flag " + c.iso2 + "'></div></div>";
				// and the country name and dial code
				tmp += "<span class='country-name'>" + c.name + "</span>";
				tmp += "<span class='dial-code'>+" + c.dialCode + "</span>";
				// close the list item
				tmp += "</li>";
			}
		}

		this.countryList.innerHTML += tmp;
	},


	// set the initial state of the input value and the selected flag
	_setInitialState: function() {
		let val = this.element.value;

		// if there is a number, and it's valid, we can go ahead and set the flag, else fall back to default
		if (this._getDialCode(val)) {
			this._updateFlagFromNumber(val, true);
		} else if (this.options.defaultCountry != "auto") {
			// check the defaultCountry option, else fall back to the first in the list
			if (this.options.defaultCountry) {
				this.options.defaultCountry = this._getCountryData(this.options.defaultCountry.toLowerCase(), false, false);
			} else {
				this.options.defaultCountry = (this.preferredCountries.length) ? this.preferredCountries[0] : this.countries[0];
			}
			this._selectFlag(this.options.defaultCountry.iso2);

			// if empty, insert the default dial code (this function will check !nationalMode and !autoHideDialCode)
			if (!val) {
				this._updateDialCode(this.options.defaultCountry.dialCode, false);
			}
		}

		// format
		if (val) {
			// this wont be run after _updateDialCode as that's only called if no val
			this._updateVal(val);
		}
	},


	// initialise the main event listeners: input keyup, and click selected flag
	_initListeners: function() {
		let that = this;
		this._eventListeners = {};

		this._initKeyListeners();

		// autoFormat prevents the change event from firing, so we need to check for changes between focus and blur in order to manually trigger it
		if (this.options.autoHideDialCode || this.options.autoFormat) {
			this._initFocusListeners();
		}

		if (this.isMobile) {
			this._eventListeners.onMobileCountryListChange = createHandler(this.countryList, function(e) {

				let selectedItem = this.querySelector("option:checked");

				if (selectedItem) { that._selectListItem(selectedItem); }
			});

			addEventListener(this.countryList, "change", this._eventListeners.onMobileCountryListChange);
		}
		// FIXME: tests still pass when this statement is commented out -_-
		else {
			// hack for input nested inside label: clicking the selected-flag to open the dropdown would then automatically trigger a 2nd click on the input which would close it again
			let label = getClosestParent(this.element, "label");
			if (label) {
				this._eventListeners.onLabelClicked = createHandler(function(e) {

					// if the dropdown is closed, then focus the input, else ignore the click
					if (hasClass(that.countryList, "hide")) {
						that.element.focus();
					} else {
						preventDefault(e);
					}
				});

				addEventListener(label, "click", this._eventListeners.onLabelClicked);
			}

			// toggle country dropdown on click
			this._eventListeners.onSelectedFlagClicked = createHandler(this.selectedFlag, function(e) {

				// only intercept this event if we're opening the dropdown
				// else let it bubble up to the top ("click-off-to-close" listener)
				// we cannot just stopPropagation as it may be needed to close another instance
				if (hasClass(that.countryList, "hide") && !that.element.disabled && !that.element.readonly) {
					that._showDropdown();
				}
			});

			addEventListener(this.selectedFlag, "click", this._eventListeners.onSelectedFlagClicked);
		}

		// open dropdown list if currently focused
		this._eventListeners.onFlagKeydown = createHandler(this.flagsContainer, function(e) {
			let isDropdownHidden = hasClass(that.countryList, "hide");
			let which = whichKey(e);

			if (isDropdownHidden &&
				(which == keys.UP || which == keys.DOWN ||
				which == keys.SPACE || which == keys.ENTER)
			) {
				// prevent form from being submitted if "ENTER" was pressed
				preventDefault(e);

				// prevent event from being handled again by document
				stopPropagation(e);

				that._showDropdown();
			}

			// allow navigation from dropdown to input on TAB
			if (which == keys.TAB) {
				that._closeDropdown();
			}
		});

		addEventListener(this.flagsContainer, "keydown", this._eventListeners.onFlagKeydown);
	},


	_initRequests: function() {
		if (this.options.defaultCountry == "auto") {
			this._loadAutoCountry();
		}
	},



	_loadAutoCountry: function() {
		let that = this;

		// check for cookie
		let cookieAutoCountry = storage.get("itiAutoCountry");
		if (cookieAutoCountry) {
			IntlTelInput.autoCountry = cookieAutoCountry;
		}

		// 3 options:
		// 1) already loaded (we're done)
		// 2) not already started loading (start)
		// 3) already started loading (do nothing - just wait for loading callback to fire)
		if (IntlTelInput.autoCountry) {
			this.autoCountryLoaded();
		} else if (!IntlTelInput.startedLoadingAutoCountry) {
			// don't do this twice!
			IntlTelInput.startedLoadingAutoCountry = true;

			if (typeof this.options.geoIpLookup === 'function') {
				this.options.geoIpLookup(function(countryCode) {
					IntlTelInput.autoCountry = countryCode.toLowerCase();

					storage.set("itiAutoCountry", IntlTelInput.autoCountry, {path: '/'});

					// tell all instances the auto country is ready
					// TODO: this should just be the current instances
					// UPDATE: use setTimeout in case their geoIpLookup function calls this callback straight away (e.g. if they have already done the geo ip lookup somewhere else). Using setTimeout means that the current thread of execution will finish before executing this, which allows the plugin to finish initialising.
					setTimeout(function() {

						forEach(allInstances, function(instance) {

							if (instance) { instance.autoCountryLoaded(); }
						});
					});
				});
			}
		}
	},



	_initKeyListeners: function() {
		let that = this;

		if (this.options.autoFormat) {
			// format number and update flag on keypress
			// use keypress event as we want to ignore all input except for a select few keys,
			// but we dont want to ignore the navigation keys like the arrows etc.
			// NOTE: no point in refactoring this to only bind these listeners on focus/blur because then you would need to have those 2 listeners running the whole time anyway...
			this._eventListeners.onElementKeypress = createHandler(this.element, function(e) {
				// 32 is space, and after that it's all chars (not meta/nav keys)
				// this fix is needed for Firefox, which triggers keypress event for some meta/nav keys
				// Update: also ignore if this is a metaKey e.g. FF and Safari trigger keypress on the v of Ctrl+v
				// Update: also ignore if ctrlKey (FF on Windows/Ubuntu)
				// Update: also check that we have utils before we do any autoFormat stuff
				let which = whichKey(e);

				if (which >= keys.SPACE && !e.ctrlKey && !e.metaKey && (<any>window).intlTelInputUtils && !that.element.readonly) {
					preventDefault(e);
					// allowed keys are just numeric keys and plus
					// we must allow plus for the case where the user does select-all and then hits plus to start typing a new number. we could refine this logic to first check that the selection contains a plus, but that wont work in old browsers, and I think it's overkill anyway
					let isAllowedKey = ((which >= keys.ZERO && which <= keys.NINE) || which == keys.PLUS),
						input = that.element,
						noSelection = (that.isGoodBrowser && input.selectionStart == input.selectionEnd),
						max = (that.element.maxlength || that.element.getAttribute("maxlength")),
						val = that.element.value,
						// assumes that if max exists, it is >0
						isBelowMax = (max) ? (val.length < max) : true;
					// first: ensure we dont go over maxlength. we must do this here to prevent adding digits in the middle of the number
					// still reformat even if not an allowed key as they could by typing a formatting char, but ignore if there's a selection as doesn't make sense to replace selection with illegal char and then immediately remove it
					if (isBelowMax && (isAllowedKey || noSelection)) {
						let newChar = (isAllowedKey) ? String.fromCharCode(which) : null;
						that._handleInputKey(newChar, true, isAllowedKey);
						// if something has changed, trigger the input event (which was otherwised squashed by the preventDefault)
						if (val != that.element.value) {
							dispatchEvent(that.element, "input", true, false);
						}
					}
					if (!isAllowedKey) {
						that._handleInvalidKey();
					}
				}
			});

			addEventListener(this.element, "keypress", this._eventListeners.onElementKeypress);
		}

		// handle cut/paste event (now supported in all major browsers)
		this._eventListeners.onElementCutOrPaste = createHandler(this.element, function() {
			// hack because "paste" event is fired before input is updated
			setTimeout(function() {
				if (that.options.autoFormat && (<any>window).intlTelInputUtils) {
					let cursorAtEnd = (that.isGoodBrowser && that.element.selectionStart == that.element.value.length);
					that._handleInputKey(null, cursorAtEnd);
					that._ensurePlus();
				} else {
					// if no autoFormat, just update flag
					// FIXME: tests still pass when this line is commented
					that._updateFlagFromNumber(that.element.value);
				}
			});
		});

		addEventListener(this.element, "paste", this._eventListeners.onElementCutOrPaste);
		addEventListener(this.element, "cut", this._eventListeners.onElementCutOrPaste);

		// handle keyup event
		// if autoFormat enabled: we use keyup to catch delete events (after the fact)
		// if no autoFormat, this is used to update the flag
		this._eventListeners.onElementKeyup = createHandler(this.element, function(e) {
			// the "enter" key event from selecting a dropdown item is triggered here on the input, because the document.keydown handler that initially handles that event triggers a focus on the input, and so the keyup for that same key event gets triggered here. weird, but just make sure we dont bother doing any re-formatting in this case (we've already done preventDefault in the keydown handler, so it wont actually submit the form or anything).
			// ALSO: ignore keyup if readonly
			let which = whichKey(e);

			if (which == keys.ENTER || that.element.readonly) {
				// do nothing
			} else if (that.options.autoFormat && (<any>window).intlTelInputUtils) {
				// cursorAtEnd defaults to false for bad browsers else they would never get a reformat on delete
				let cursorAtEnd = (that.isGoodBrowser && that.element.selectionStart == that.element.value.length);

				if (!that.element.value) {
					// if they just cleared the input, update the flag to the default
					that._updateFlagFromNumber("");
				} else if ((which == keys.DEL && !cursorAtEnd) || which == keys.BSPACE) {
					// if delete in the middle: reformat with no suffix (no need to reformat if delete at end)
					// if backspace: reformat with no suffix (need to reformat if at end to remove any lingering suffix - this is a feature)
					// important to remember never to add suffix on any delete key as can fuck up in ie8 so you can never delete a formatting char at the end
					that._handleInputKey();
				}
				that._ensurePlus();
			} else {
				// if no autoFormat, just update flag
				that._updateFlagFromNumber(that.element.value);
			}
		});

		addEventListener(this.element, "keyup", this._eventListeners.onElementKeyup);
	},


	// prevent deleting the plus (if not in nationalMode)
	_ensurePlus: function() {
		if (!this.options.nationalMode) {
			let val = this.element.value;

			if (val.charAt(0) != "+") {
				// newCursorPos is current pos + 1 to account for the plus we are about to add
				let newCursorPos = (this.isGoodBrowser) ? this.element.selectionStart + 1 : 0;

				// FIXME: tests still pass when this line is commented out -_-
				this.element.value = "+" + val;

				if (this.isGoodBrowser) {
					this.element.setSelectionRange(newCursorPos, newCursorPos);
				}
			}
		}
	},


	// alert the user to an invalid key event
	_handleInvalidKey: function() {
		let that = this;

		dispatchCustomEvent(this.element, "invalidkey", true, true);

		addClass(this.element, "iti-invalid-key");

		setTimeout(function() {
			removeClass(that.element, "iti-invalid-key");
		}, 100);
	},


	// when autoFormat is enabled: handle various key events on the input:
	// 1) adding a new number character, which will replace any selection, reformat, and preserve the cursor position
	// 2) reformatting on backspace/delete
	// 3) cut/paste event
	_handleInputKey: function(newNumericChar, addSuffix, isAllowedKey) {
		let val = this.element.value,
			cleanBefore = this._getClean(val),
			originalLeftChars,
			digitsOnRight = 0;

		if (this.isGoodBrowser) {
			// cursor strategy: maintain the number of digits on the right. we use the right instead of the left so that A) we dont have to account for the new digit (or multiple digits if paste event), and B) we're always on the right side of formatting suffixes
			digitsOnRight = this._getDigitsOnRight(val, this.element.selectionEnd);

			// if handling a new number character: insert it in the right place
			if (newNumericChar) {
				// replace any selection they may have made with the new char
				val = val.substr(0, this.element.selectionStart) + newNumericChar + val.substring(this.element.selectionEnd, val.length);
			} else {
				// here we're not handling a new char, we're just doing a re-format (e.g. on delete/backspace/paste, after the fact), but we still need to maintain the cursor position. so make note of the char on the left, and then after the re-format, we'll count in the same number of digits from the right, and then keep going through any formatting chars until we hit the same left char that we had before.
				// UPDATE: now have to store 2 chars as extensions formatting contains 2 spaces so you need to be able to distinguish
				originalLeftChars = val.substr(this.element.selectionStart - 2, 2);
			}
		} else if (newNumericChar) {
			val += newNumericChar;
		}

		// update the number and flag
		this.setNumber(val, null, addSuffix, true, isAllowedKey);

		// update the cursor position
		if (this.isGoodBrowser) {
			let newCursor;
			val = this.element.value;

			// if it was at the end, keep it there
			if (!digitsOnRight) {
				newCursor = val.length;
			} else {
				// else count in the same number of digits from the right
				newCursor = this._getCursorFromDigitsOnRight(val, digitsOnRight);

				// but if delete/paste etc, keep going left until hit the same left char as before
				if (!newNumericChar) {
					newCursor = this._getCursorFromLeftChar(val, newCursor, originalLeftChars);
				}
			}
			// set the new cursor
			this.element.setSelectionRange(newCursor, newCursor);
		}
	},


	// we start from the position in guessCursor, and work our way left until we hit the originalLeftChars or a number to make sure that after reformatting the cursor has the same char on the left in the case of a delete etc
	_getCursorFromLeftChar: function(val, guessCursor, originalLeftChars) {
		for (let i = guessCursor; i > 0; i--) {
			let leftChar = val.charAt(i - 1);
			if (isNumeric(leftChar) || val.substr(i - 2, 2) == originalLeftChars) {
				return i;
			}
		}
		return 0;
	},


	// after a reformat we need to make sure there are still the same number of digits to the right of the cursor
	_getCursorFromDigitsOnRight: function(val, digitsOnRight) {
		for (let i = val.length - 1; i >= 0; i--) {
			if (isNumeric(val.charAt(i))) {
				if (--digitsOnRight === 0) {
					return i;
				}
			}
		}
		return 0;
	},


	// get the number of numeric digits to the right of the cursor so we can reposition the cursor correctly after the reformat has happened
	_getDigitsOnRight: function(val, selectionEnd) {
		let digitsOnRight = 0;
		for (let i = selectionEnd; i < val.length; i++) {
			if (isNumeric(val.charAt(i))) {
				digitsOnRight++;
			}
		}
		return digitsOnRight;
	},


	// listen for focus and blur
	_initFocusListeners: function() {
		let that = this;

		if (this.options.autoHideDialCode) {
			this._eventListeners.onElementMousedown = createHandler(this.element, function(e) {

				// FIXME: tests still pass when this statement is commented out -_-
				if (!hasFocus(that.element) && !that.element.value) {
					preventDefault(e);
					// but this also cancels the focus, so we must trigger that manually
					that.element.focus();
				}
			});

			// mousedown decides where the cursor goes, so if we're focusing we must preventDefault as we'll be inserting the dial code, and we want the cursor to be at the end no matter where they click
			addEventListener(this.element, "mousedown", this._eventListeners.onElementMousedown);
		}

		this._eventListeners.plusPressedListeners = [];

		this._eventListeners.onElementFocused = createHandler(this.element, function(e) {
			let value = that.element.value;

			// save this to compare on blur
			// FIXME: tests pass when this line is commented out -_-
			that.element.setAttribute("data-focus-val", value);

			// on focus: if empty, insert the dial code for the currently selected flag
			if (that.options.autoHideDialCode && !value && !that.element.readonly && that.selectedCountryData.dialCode) {
				that._updateVal("+" + that.selectedCountryData.dialCode, null, true);
				// after auto-inserting a dial code, if the first key they hit is '+' then assume they are entering a new number, so remove the dial code. use keypress instead of keydown because keydown gets triggered for the shift key (required to hit the + key), and instead of keyup because that shows the new '+' before removing the old one
				let onElementPlusPressed = createHandler(that.element, function(e) {
					let which = whichKey(e);

					if (which == keys.PLUS) {
						// if autoFormat is enabled, this key event will have already have been handled by another keypress listener (hence we need to add the "+"). if disabled, it will be handled after this by a keyup listener (hence no need to add the "+").
						let newVal = (that.options.autoFormat && (<any>window).intlTelInputUtils) ? "+" : "";

						// FIXME: tests still pass when this line is commented out -_-
						that.element.value = newVal;
					}

					removeEventListener(that.element, "keypress", onElementPlusPressed);
				});

				addEventListener(that.element, "keypress", onElementPlusPressed);
				that._eventListeners.plusPressedListeners.push(onElementPlusPressed);

				// after tabbing in, make sure the cursor is at the end we must use setTimeout to get outside of the focus handler as it seems the selection happens after that
				setTimeout(function() {

					// FIXME: tests still pass when this statement is commented out -_-
					if (that.isGoodBrowser) {
						let len = that.element.value.length;
						that.element.setSelectionRange(len, len);
					}
				});
			}
		});

		this._eventListeners.onElementBlurred = createHandler(this.element, function() {

			if (that.options.autoHideDialCode) {
				// on blur: if just a dial code then remove it
				let value = that.element.value,
					startsPlus = (value.charAt(0) == "+");
				if (startsPlus) {
					let numeric = that._getNumeric(value);
					// if just a plus, or if just a dial code
					if (!numeric || that.selectedCountryData.dialCode == numeric) {
						that.element.value = "";
					}
				}
				// remove the keypress listener we added on focus
				forEach(that._eventListeners.plusPressedListeners, function(listener) {

					removeEventListener(that.element, "keypress", listener);
				});

				that._eventListeners.plusPressedListeners = [];
			}

			// if autoFormat, we must manually trigger change event if value has changed
			// FIXME: tests pass when this statement is commented out -_-
			if (that.options.autoFormat && (<any>window).intlTelInputUtils &&
				that.element.value != that.element.getAttribute("data-focus-val")) {

				dispatchEvent(that.element, "change", true, false);
			}
		});

		addEventListener(this.element, "focus", this._eventListeners.onElementFocused);
		addEventListener(this.element, "blur", this._eventListeners.onElementBlurred);

		// made the decision not to trigger blur() now, because would only do anything in the case where they manually set the initial value to just a dial code, in which case they probably want it to be displayed.
	},


	// extract the numeric digits from the given string
	_getNumeric: function(s) {
		return s.replace(/\D/g, "");
	},


	_getClean: function(s) {
		let prefix = (s.charAt(0) == "+") ? "+" : "";
		return prefix + this._getNumeric(s);
	},


	// show the dropdown
	_showDropdown: function() {
		this._setDropdownPosition();

		// update highlighting and scroll to active list item
		let activeListItem = this.countryList.querySelector(".active");
		if (activeListItem) {
			this._highlightListItem(activeListItem);
		}

		// show it
		removeClass(this.countryList, "hide");

		if (activeListItem) {
			this._scrollTo(activeListItem);
		}

		// bind all the dropdown-related listeners: mouseover, click, click-off, keydown
		this._bindDropdownListeners();

		// update the arrow
		// FIXED: arrow is a child of selectedFlag not selectedFlagInner
		// FIXME: tests still pass when this line is commented -_-
		addClass(this.arrow, "up");
	},


	// decide where to position dropdown (depends on position within viewport, and scroll)
	_setDropdownPosition: function() {
		let inputTop = getOffset(this.element).top,
			windowTop = getWindowScrollTop(),
			// dropdownFitsBelow = (dropdownBottom < windowBottom)
			dropdownFitsBelow = (inputTop + this.element.offsetHeight+this.dropdownHeight < windowTop+getWindowInnerHeight()),
			dropdownFitsAbove = (inputTop - this.dropdownHeight > windowTop);

		// dropdownHeight - 1 for border
		// FIXME: cssTop sometimes has two leading negative signs (e.g: --1px)
		let cssTop = (!dropdownFitsBelow && dropdownFitsAbove) ? "-" + (this.dropdownHeight - 1) + "px" : "";

		this.countryList.style.top = cssTop;
	},


	// we only bind dropdown listeners when the dropdown is open
	_bindDropdownListeners: function() {
		let that = this;

		if (Element.prototype.addEventListener) {
			// when mouse over a list item, just highlight that one
			// we add the class "highlight", so if they hit "enter" we know which one to select
			this._eventListeners.onListItemMouseover = function(e) {
				// FIXME: tests still pass when this element is commented out -_-
				that._highlightListItem(this);
			};

			// listen for country selection
			this._eventListeners.onDesktopCountryItemClicked = function(e) {
				that._selectListItem(this);
			};
		}
		else {
			// when mouse over a list item, just highlight that one
			// we add the class "highlight", so if they hit "enter" we know which one to select
			this._eventListeners.onListItemMouseover = function(e) {
				// since IE8 doesn't bind `this` to the clicked element, we have to do some traversing, or add an event listener
				// for each item -_-
				let target = e.currentTarget || e.target || e.srcElement;
				let listItem = getClosestParent(target, "li");

				// FIXME: tests still pass when this element is commented out -_-
				if (listItem) { that._highlightListItem(listItem); }
			};

			// listen for country selection
			this._eventListeners.onDesktopCountryItemClicked = function(e) {
				// since IE8 doesn't bind `this` to the clicked element, we have to do some traversing, or add an event listener
				// for each item -_-
				let target = e.currentTarget || e.target || e.srcElement;
				let listItem = getClosestParent(target, "li");

				if (listItem) { that._selectListItem(listItem); }
			};
		}

		forEach(this.countryListItems, function(element) {

			addEventListener(element, "click", that._eventListeners.onDesktopCountryItemClicked);
			addEventListener(element, "mouseover", that._eventListeners.onListItemMouseover);
		});

		// click off to close
		// (except when this initial opening click is bubbling up)
		// we cannot just stopPropagation as it may be needed to close another instance
		let isOpening = true;
		this._eventListeners.onHtmlClicked = createHandler(document, function(e) {
			if (!isOpening) {
				that._closeDropdown();
			}
			isOpening = false;
		});

		addEventListener(document, "click", this._eventListeners.onHtmlClicked);

		// listen for up/down scrolling, enter to select, or letters to jump to country name.
		// use keydown as keypress doesn't fire for non-char keys and we want to catch if they
		// just hit down and hold it to scroll down (no keyup event).
		// listen on the document because that's where key events are triggered if no input has focus
		// FIXME: maybe it's better to only preventDefault() if we know how to handle the key
		let query = "",
			queryTimer = null;
		this._eventListeners.onDocumentKeydown = createHandler(document, function(e) {
			// prevent down key from scrolling the whole page,
			// and enter key from submitting a form etc
			preventDefault(e);

			let which = whichKey(e);

			if (which == keys.UP || which == keys.DOWN) {
				// up and down to navigate
				that._handleUpDownKey(which);
			} else if (which == keys.ENTER) {
				// enter to select
				that._handleEnterKey();
			} else if (which == keys.ESC) {
				// esc to close
				that._closeDropdown();
			} else if ((which >= keys.A && which <= keys.Z) || which == keys.SPACE) {
				// upper case letters (note: keyup/keydown only return upper case letters)
				// jump to countries that start with the query string
				if (queryTimer) {
					clearTimeout(queryTimer);
				}
				query += String.fromCharCode(which);
				that._searchForCountry(query);
				// if the timer hits 1 second, reset the query
				queryTimer = setTimeout(function() {
					query = "";
				}, 1000);
			}
		});

		addEventListener(document, "keydown", this._eventListeners.onDocumentKeydown);
	},


	// highlight the next/prev item in the list (and ensure it is visible)
	_handleUpDownKey: function(key) {
		let current = this.countryList.querySelector(".highlight");
		let next = (key == keys.UP) ? current.previousSibling : current.nextSibling;

		if (next) {
			// skip the divider
			if (hasClass(next, "divider")) {
				next = (key == keys.UP) ? next.previousSibling : next.nextSibling;
			}
			this._highlightListItem(next);
			this._scrollTo(next);
		}
	},


	// select the currently highlighted item
	_handleEnterKey: function() {
		let currentCountry = this.countryList.querySelector(".highlight");

		if (currentCountry) {
			this._selectListItem(currentCountry);
		}
	},


	// find the first list item whose name starts with the query string
	// NOTE: consider adding `data-country-name` atrribute and using [data-country-name^=<query>] css selector
	_searchForCountry: function(query) {
		for (let i = 0; i < this.countries.length; i++) {
			if (this._startsWith(this.countries[i].name, query)) {

				let listItem = methods.getListItemByCode(this.countryList, this.countries[i].iso2);

				// update highlighting and scroll
				if (listItem) {
					this._highlightListItem(listItem);
					this._scrollTo(listItem, true);
				}

				break;
			}
		}
	},


	// check if (uppercase) string a starts with string b
	_startsWith: function(a, b) {
		return (a.substr(0, b.length).toUpperCase() == b);
	},


	// update the input's value to the given val
	// if autoFormat=true, format it first according to the country-specific formatting rules
	// Note: preventConversion will be false (i.e. we allow conversion) on init and when dev calls public method setNumber
	_updateVal: function(val, format, addSuffix, preventConversion, isAllowedKey) {
		let formatted;

		if (this.options.autoFormat && (<any>window).intlTelInputUtils && this.selectedCountryData) {
			if (typeof(format) == "number" && intlTelInputUtils.isValidNumber(val, this.selectedCountryData.iso2)) {
				// if user specified a format, and it's a valid number, then format it accordingly
				formatted = intlTelInputUtils.formatNumberByType(val, this.selectedCountryData.iso2, format);
			} else if (!preventConversion && this.options.nationalMode && val.charAt(0) == "+" && intlTelInputUtils.isValidNumber(val, this.selectedCountryData.iso2)) {
				// if nationalMode and we have a valid intl number, convert it to ntl
				formatted = intlTelInputUtils.formatNumberByType(val, this.selectedCountryData.iso2, intlTelInputUtils.numberFormat.NATIONAL);
			} else {
				// else do the regular AsYouType formatting
				formatted = intlTelInputUtils.formatNumber(val, this.selectedCountryData.iso2, addSuffix, this.options.allowExtensions, isAllowedKey);
			}
			// ensure we dont go over maxlength. we must do this here to truncate any formatting suffix, and also handle paste events
			let max = this.element.getAttribute("maxlength");
			if (max && formatted.length > max) {
				formatted = formatted.substr(0, max);
			}
		} else {
			// no autoFormat, so just insert the original value
			formatted = val;
		}

		this.element.value = formatted;
	},


	// check if need to select a new flag based on the given number
	_updateFlagFromNumber: function(number, updateDefault) {
		// if we're in nationalMode and we're on US/Canada, make sure the number starts with a +1 so _getDialCode will be able to extract the area code
		// update: if we dont yet have selectedCountryData, but we're here (trying to update the flag from the number), that means we're initialising the plugin with a number that already has a dial code, so fine to ignore this bit
		if (number && this.options.nationalMode && this.selectedCountryData && this.selectedCountryData.dialCode == "1" && number.charAt(0) != "+") {
			if (number.charAt(0) != "1") {
				number = "1" + number;
			}
			number = "+" + number;
		}
		// try and extract valid dial code from input
		let dialCode = this._getDialCode(number),
			countryCode = null;
		if (dialCode) {
			// check if one of the matching countries is already selected
			let countryCodes = this.countryCodes[this._getNumeric(dialCode)],
				alreadySelected = (this.selectedCountryData && inArray(this.selectedCountryData.iso2, countryCodes) != -1);
			// if a matching country is not already selected (or this is an unknown NANP area code): choose the first in the list
			if (!alreadySelected || this._isUnknownNanp(number, dialCode)) {
				// if using onlyCountries option, countryCodes[0] may be empty, so we must find the first non-empty index
				for (let j = 0; j < countryCodes.length; j++) {
					if (countryCodes[j]) {
						countryCode = countryCodes[j];
						break;
					}
				}
			}
		} else if (number.charAt(0) == "+" && this._getNumeric(number).length) {
			// invalid dial code, so empty
			// Note: use getNumeric here because the number has not been formatted yet, so could contain bad shit
			countryCode = "";
		} else if (!number || number == "+") {
			// empty, or just a plus, so default
			countryCode = this.options.defaultCountry.iso2;
		}

		if (countryCode !== null) {
			this._selectFlag(countryCode, updateDefault);
		}
	},


	// check if the given number contains an unknown area code from the North American Numbering Plan i.e. the only dialCode that could be extracted was +1 but the actual number's length is >=4
	_isUnknownNanp: function(number, dialCode) {
		return (dialCode == "+1" && this._getNumeric(number).length >= 4);
	},


	// remove highlighting from other list items and highlight the given item
	_highlightListItem: function(listItem) {

		forEach(this.countryList.querySelectorAll(".highlight"), function (element) {

			removeClass(element, "highlight");
		});

		addClass(listItem, "highlight");
	},


	// find the country data for the given country code
	// the ignoreOnlyCountriesOption is only used during init() while parsing the onlyCountries array
	_getCountryData: function(countryCode, ignoreOnlyCountriesOption, allowFail) {
		let countryList = (ignoreOnlyCountriesOption) ? allCountries : this.countries;
		for (let i = 0; i < countryList.length; i++) {
			if (countryList[i].iso2 == countryCode) {
				return countryList[i];
			}
		}
		if (allowFail) {
			return null;
		} else {
			throw new Error("No country data for '" + countryCode + "'");
		}
	},


	// select the given flag, update the placeholder and the active list item
	_selectFlag: function(countryCode, updateDefault) {
		// do this first as it will throw an error and stop if countryCode is invalid
		this.selectedCountryData = (countryCode) ? this._getCountryData(countryCode, false, false) : {};
		// update the "defaultCountry" - we only need the iso2 from now on, so just store that
		if (updateDefault && this.selectedCountryData.iso2) {
			// can't just make this equal to selectedCountryData as would be a ref to that object
			this.options.defaultCountry = {
				iso2: this.selectedCountryData.iso2
			};
		}

		this.selectedFlagInner.className = "iti-flag " + countryCode;

		// update the selected country's title attribute
		let title = (countryCode) ? this.selectedCountryData.name + ": +" + this.selectedCountryData.dialCode : "Unknown";
		this.selectedFlag.setAttribute("title", title);

		// and the input's placeholder
		this._updatePlaceholder();

		if (this.isMobile) {
			// FIXME: tests still pass when this line is commented out
			this.countryList.value = countryCode;
		} else {
			// update the active list item

			forEach(this.countryList.querySelectorAll(".active"), function(element) {

				removeClass(element, "active");
			});

			if (countryCode) {
				addClass(this.countryList.querySelector("[data-country-code=" + countryCode + "]"), "active");
			}
		}
	},


	// update the input placeholder to an example number from the currently selected country
	_updatePlaceholder: function() {
		if ((<any>window).intlTelInputUtils && !this.hadInitialPlaceholder && this.options.autoPlaceholder && this.selectedCountryData) {
			let iso2 = this.selectedCountryData.iso2,
				numberType = intlTelInputUtils.numberType[this.options.numberType || "FIXED_LINE"],
				placeholder = (iso2) ? intlTelInputUtils.getExampleNumber(iso2, this.options.nationalMode, numberType) : "";

			if (typeof this.options.customPlaceholder === 'function') {
				placeholder = this.options.customPlaceholder(placeholder, this.selectedCountryData);
			}

			this.element.setAttribute("placeholder", placeholder);
		}
	},


	// called when the user selects a list item from the dropdown
	_selectListItem: function(listItem) {
		let countryCodeAttr = (this.isMobile) ? "value" : "data-country-code";
		// update selected flag and active list item
		this._selectFlag(listItem.getAttribute(countryCodeAttr), true);
		if (!this.isMobile) {
			this._closeDropdown();
		}

		this._updateDialCode(listItem.getAttribute("data-dial-code"), true);

		// always fire the change event as even if nationalMode=true (and we haven't updated the input val), the system as a whole has still changed - see country-sync example. think of it as making a selection from a select element.
		dispatchEvent(this.element, "change", true, false);

		// focus the input
		this.element.focus();
		// fix for FF and IE11 (with nationalMode=false i.e. auto inserting dial code), who try to put the cursor at the beginning the first time
		if (this.isGoodBrowser) {
			let len = this.element.value.length;
			this.element.setSelectionRange(len, len);
		}
	},


	// close the dropdown and unbind any listeners
	_closeDropdown: function() {

		addClass(this.countryList, "hide");

		// update the arrow
		// FIXED: arrow is a child of selectedFlag not selectedFlagInner
		// FIXME: tests still pass when this line is commented out -_-
		removeClass(this.arrow, "up");

		// unbind key events
		removeEventListener(document, "keydown", this._eventListeners.onDocumentKeydown);

		// unbind click-off-to-close
		removeEventListener(document, "click", this._eventListeners.onHtmlClicked);

		// unbind hover and click listeners
		let onDesktopCountryItemClicked = this._eventListeners.onDesktopCountryItemClicked;
		let onListItemMouseover = this._eventListeners.onListItemMouseover;

		forEach(this.countryListItems, function(element) {

			removeEventListener(element, "mouseover", onListItemMouseover);
			removeEventListener(element, "click", onDesktopCountryItemClicked);
		});
	},


	// check if an element is visible within it's container, else scroll until it is
	_scrollTo: function(element, middle) {
		let container = this.countryList,
			containerHeight = container.clientHeight,
			containerTop = getOffset(container).top,
			containerBottom = containerTop + containerHeight,
			elementHeight = element.offsetHeight,
			elementTop = getOffset(element).top,
			elementBottom = elementTop + elementHeight,
			newScrollTop = elementTop - containerTop + container.scrollTop,
			middleOffset = (containerHeight / 2) - (elementHeight / 2);

		if (elementTop < containerTop) {
			// scroll up
			if (middle) {
				newScrollTop -= middleOffset;
			}
			container.scrollTop = newScrollTop;
		} else if (elementBottom > containerBottom) {
			// scroll down
			if (middle) {
				newScrollTop += middleOffset;
			}
			let heightDifference = containerHeight - elementHeight;
			container.scrollTop = newScrollTop - heightDifference;
		}
	},


	// replace any existing dial code with the new one (if not in nationalMode)
	// also we need to know if we're focusing for a couple of reasons e.g. if so, we want to add any formatting suffix, also if the input is empty and we're not in nationalMode, then we want to insert the dial code
	_updateDialCode: function(newDialCode, focusing) {
		let inputVal = this.element.value,
			newNumber;

		// save having to pass this every time
		newDialCode = "+" + newDialCode;

		if (this.options.nationalMode && inputVal.charAt(0) != "+") {
			// if nationalMode, we just want to re-format
			newNumber = inputVal;
		} else if (inputVal) {
			// if the previous number contained a valid dial code, replace it
			// (if more than just a plus character)
			let prevDialCode = this._getDialCode(inputVal);
			if (prevDialCode.length > 1) {
				newNumber = inputVal.replace(prevDialCode, newDialCode);
			} else {
				// if the previous number didn't contain a dial code, we should persist it
				let existingNumber = (inputVal.charAt(0) != "+") ? trim(inputVal) : "";
				newNumber = newDialCode + existingNumber;
			}
		} else {
			newNumber = (!this.options.autoHideDialCode || focusing) ? newDialCode : "";
		}

		this._updateVal(newNumber, null, focusing);
	},


	// try and extract a valid international dial code from a full telephone number
	// Note: returns the raw string inc plus character and any whitespace/dots etc
	_getDialCode: function(number) {
		let dialCode = "";
		// only interested in international numbers (starting with a plus)
		if (number.charAt(0) == "+") {
			let numericChars = "";
			// iterate over chars
			for (let i = 0; i < number.length; i++) {
				let c = number.charAt(i);
				// if char is number
				if (isNumeric(c)) {
					numericChars += c;
					// if current numericChars make a valid dial code
					if (this.countryCodes[numericChars]) {
						// store the actual raw string (useful for matching later)
						dialCode = number.substr(0, i + 1);
					}
					// longest dial code is 4 chars
					if (numericChars.length == 4) {
						break;
					}
				}
			}
		}
		return dialCode;
	},



	/********************
	 *  PUBLIC METHODS
	 ********************/

	// this is called when the geoip call returns
	autoCountryLoaded: function() {
		if (this.options.defaultCountry == "auto") {
			this.options.defaultCountry = IntlTelInput.autoCountry;
			this._setInitialState();

		}
	},

	// remove plugin
	destroy: function() {

		allInstances[this.id] = null;

		if (!this.isMobile) {
			// make sure the dropdown is closed (and unbind listeners)
			this._closeDropdown();
		}

		removeEventListener(this.element, "paste", this._eventListeners.onElementCutOrPaste);
		removeEventListener(this.element, "cut", this._eventListeners.onElementCutOrPaste);
		removeEventListener(this.element, "keyup", this._eventListeners.onElementKeyup);

		// key events, and focus/blur events if autoHideDialCode=true
		if (this.options.autoHideDialCode || this.options.autoFormat) {

			let element = this.element;

			removeEventListener(element, "focus", this._eventListeners.onElementFocused);
			removeEventListener(element, "blur", this._eventListeners.onElementBlurred);

			forEach(this._eventListeners.plusPressedListeners, function(listener) {

				removeEventListener(element, "keypress", listener);
			});

			this._eventListeners.plusPressedListeners = [];
		}

		if (this.options.autoHideDialCode) {
			removeEventListener(this.element, "mousedown", this._eventListeners.onElementMousedown);
		}

		if (this.options.autoFormat) {
			removeEventListener(this.element, "keypress", this._eventListeners.onElementKeypress);
		}

		if (this.isMobile) {
			// change event on select country
			removeEventListener(this.countryList, "change", this._eventListeners.onMobileCountryListChange);
		} else {
			// label click hack
			let label = getClosestParent(this.element, "label");

			// click event to open dropdown
			removeEventListener(this.flagsContainer, "keydown", this._eventListeners.onFlagKeydown);
			removeEventListener(this.selectedFlag, "click", this.onSelectedFlagClicked);

			if (label) { removeEventListener(label, "click", this._eventListeners.onLabelClicked); }
		}

		// remove markup
		let container = this.element.parentNode;

		if (container.parentNode) {
			container.parentNode.insertBefore(this.element, container);
			container.parentNode.removeChild(container);
		}
		else {
			// Surprisingly, jQuery does something similar, but more complicated
			let fakeWrapper = document.createElement("div");
			fakeWrapper.appendChild(this.element);
		}
	},


	// extract the phone number extension if present
	getExtension: function() {
		return this.element.value.split(" ext. ")[1] || "";
	},


	// format the number to the given type
	getNumber: function(type) {
		if ((<any>window).intlTelInputUtils) {
			return intlTelInputUtils.formatNumberByType(this.element.value, this.selectedCountryData.iso2, type);
		}
		return "";
	},


	// get the type of the entered number e.g. landline/mobile
	getNumberType: function() {
		if ((<any>window).intlTelInputUtils) {
			return intlTelInputUtils.getNumberType(this.element.value, this.selectedCountryData.iso2);
		}
		return -99;
	},


	// get the country data for the currently selected flag
	getSelectedCountryData: function() {
		// if this is undefined, the plugin will return it's instance instead, so in that case an empty object makes more sense
		return this.selectedCountryData || {};
	},


	// get the validation error
	getValidationError: function() {
		if ((<any>window).intlTelInputUtils) {
			return intlTelInputUtils.getValidationError(this.element.value, this.selectedCountryData.iso2);
		}
		return -99;
	},


	// validate the input val - assumes the global function isValidNumber (from utilsScript)
	isValidNumber: function() {
		let val = trim(this.element.value),
				countryCode = (this.options.nationalMode) ? this.selectedCountryData.iso2 : "";

		if (!countryCode) { return false; }

		return isValidNumber(val, countryCode.toUpperCase());
	},

	getFormatNumber: function () {
		let val = trim(this.element.value),
				countryCode = (this.options.nationalMode) ? this.selectedCountryData.iso2 : "";

		if (!countryCode) { return false; }
		return format(val, countryCode.toUpperCase(), 'International');
	},

	getPlaintextNumber: function () {
		let val = trim(this.element.value),
			countryCode = (this.options.nationalMode) ? this.selectedCountryData.iso2 : "";
		if (!countryCode) { return false; }
		return trim(this.element.value);
	},

	// update the selected flag, and update the input val accordingly
	selectCountry: function(countryCode) {
		countryCode = countryCode.toLowerCase();
		// check if already selected
		if (!hasClass(this.selectedFlagInner, countryCode)) {
			this._selectFlag(countryCode, true);
			this._updateDialCode(this.selectedCountryData.dialCode, false);
		}
	},


	// set the input value and update the flag
	setNumber: function(number, format, addSuffix, preventConversion, isAllowedKey) {
		// ensure starts with plus
		if (!this.options.nationalMode && number.charAt(0) != "+") {
			number = "+" + number;
		}
		// we must update the flag first, which updates this.selectedCountryData, which is used later for formatting the number before displaying it
		this._updateFlagFromNumber(number);
		this._updateVal(number, format, addSuffix, preventConversion, isAllowedKey);
	},


	// this is called when the utils are ready
	utilsLoaded: function() {
		// if autoFormat is enabled and there's an initial value in the input, then format it
		if (this.options.autoFormat && this.element.value) {
			this._updateVal(this.element.value);
		}
		this._updatePlaceholder();
	}

};

export default IntlTelInput;