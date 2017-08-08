import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { CountriesList, ItelInputCountries } from './countries';

@Component({
  selector: 'tel-input',
	styleUrls: ['style.css'],
  template: `
    <div class="tel-input">
	    <input #input type="tel" [ngModel]="number" [textMask]="{mask: mask, showMask: true}" (click)="$event.target.select()"/>
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
  `
})
export class TelInputComponent implements OnInit{
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

	public selectedEvent(event) {
		this.input.nativeElement.value = '';
		this.mask = this.countriesList[event.value].mask;
	}

  constructor() {}

  ngOnInit() {
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
