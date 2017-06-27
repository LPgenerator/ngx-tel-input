import { Directive, ElementRef, forwardRef, HostListener, OnInit } from '@angular/core';
import { NgControl } from "@angular/forms";
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import intlInput from './intl-tel-input';
import { asYouType } from 'libphonenumber-js';

const noop = () => {};

export const CUSTOM_INPUT_CONTROL_VALUE_ACCESSOR: any = {
	provide: NG_VALUE_ACCESSOR,
	useExisting: forwardRef(() => TelInputDirective),
	multi: true
};

@Directive({
	selector: 'input[telInput]'
})
export class TelInputDirective implements ControlValueAccessor, OnInit {

	private inputInterface: any;
	private onTouchedCallback: () => void = noop;
	private onChangeCallback: (_: any) => void = noop;
	public innerValue: any;
	private formatter = new asYouType();

	constructor(
		private telInput: ElementRef,
		private control : NgControl
	) {
		this.inputInterface = new intlInput(telInput.nativeElement, {preferredCountries: ['ru']});

		telInput.nativeElement.addEventListener('change', event => {
			let currentCountry = this.inputInterface.instance.selectedCountryData;
			this.formatter = new asYouType(currentCountry.iso2);
			this.telInput.nativeElement.value = this.formatter.input(event.target.value);
			this.formatter.reset();
			this.control.control.setErrors({
				phone: !this.inputInterface.isValidNumber()
			});
		});

		telInput.nativeElement.addEventListener('input', event => {
			this.value = this.inputInterface.getPlaintextNumber(event.target.value);
		});
	}

	// get accessor
	get value() {
		return this.innerValue;
	};

	// set accessor including call the onchange callback
	set value(v) {
		this.telInput.nativeElement.value = this.formatter.input(v);
		this.formatter.reset();
		this.innerValue = v;

		if (!v) { return; }
		this.control.control.setErrors({
			phone: !this.inputInterface.isValidNumber()
		});
	}

	// Записываем начальное состояние модели
	writeValue(value: any): void {
		this.value = value;
	}

	// From ControlValueAccessor interface
	registerOnChange(fn: any) {
		this.onChangeCallback = fn;
	}

	// From ControlValueAccessor interface
	registerOnTouched(fn: any) {
		this.onTouchedCallback = fn;
	}


}