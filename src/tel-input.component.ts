import { Component, Input, OnInit, ViewChild, forwardRef, Injector } from '@angular/core';
import { CountriesList, ItelInputCountries } from './countries';

import { NG_VALUE_ACCESSOR, ControlValueAccessor, NgControl } from '@angular/forms';

const noop = () => {
};

export const CUSTOM_INPUT_CONTROL_VALUE_ACCESSOR: any = {
	provide: NG_VALUE_ACCESSOR,
	useExisting: forwardRef(() => TelInputComponent),
	multi: true
};

@Component({
  selector: 'tel-input',
	styleUrls: ['style.css'],
  template: `
    <div class="tel-input">
	    <input #input (input)="inputEvent($event)" type="tel" [ngModel]="number" [textMask]="{mask: mask, showMask: true}" (click)="$event.target.select()"/>
	    <ng-select
					    [(ngModel)]="selected"
					    [options]="countries" 
					    (selected)="selectedEvent($event)">
		    <ng-template
						    #optionTemplate
						    let-option="option">
			    <div class="flag" [ngClass]="'f_'+option?.value"></div>
			    <span class="country">{{option?.label}}</span>
		    </ng-template>
	    </ng-select>
    </div>
  `,
	providers: [CUSTOM_INPUT_CONTROL_VALUE_ACCESSOR]
})
export class TelInputComponent implements OnInit, ControlValueAccessor {
	//The internal data model
	private innerValue: any = '';

	//Placeholders for the callbacks which are later providesd
	//by the Control Value Accessor
	private onTouchedCallback: () => void = noop;
	private onChangeCallback: (_: any) => void = noop;

	//get accessor
	get value(): any {
		return this.innerValue;
	};

	//set accessor including call the onchange callback
	set value(v: any) {
		if ( this.checkErrors(v) ) { return; }
		if (v !== this.innerValue) {
			const val = v.replace( /\D/g, '');
			this.innerValue = val;
			this.onChangeCallback(val);
		}
	}

	private checkErrors(val) {
		const hasUnderscore = /\_/.test(val);
		if ( hasUnderscore ) {
			this.model.control.setErrors({phone: true});
		}
		return hasUnderscore;
	}

 //From ControlValueAccessor interface
	writeValue(value: any) {
		if (value !== this.innerValue) {
			this.innerValue = value;
		}
	}

	//From ControlValueAccessor interface
	registerOnChange(fn: any) {
		this.onChangeCallback = fn;
	}

	//From ControlValueAccessor interface
	registerOnTouched(fn: any) {
		this.onTouchedCallback = fn;
	}

	@Input('defaultCountry')defaultCountry = 'ru';
	@Input('countries')countriesList: ItelInputCountries = CountriesList;
	@ViewChild('input')input;
  public countries;
	public selected = this.defaultCountry;
	private _mask: any = [''];
	set mask(val) {
		this._mask = val.split('').map(key => key === '#' ? /\d/ : key);
	}
	get mask() {
		return this._mask;
	}

	private model: NgControl;

	public inputEvent(event) {
		this.value = event.target.value;
	}

	public selectedEvent(event) {
		this.input.nativeElement.value = '';
		this.mask = this.countriesList[event.value].mask;
	}

  constructor(private injector: Injector) {}

  ngOnInit() {
	  this.model = this.injector.get(NgControl);

		this.selected = this.defaultCountry;
	  this.countries = Object.keys(this.countriesList).map(country => {
		  return {
			  label: this.countriesList[country].name,
			  value: country
		  };
	  });
	  if (this.countriesList[this.selected]) {
		  this.mask = this.countriesList[this.selected].mask;
	  }else{
		  this.mask = this.countriesList[Object.keys(this.countriesList)[0]].mask;
	  }
  }

}
