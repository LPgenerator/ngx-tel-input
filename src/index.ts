import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TextMaskModule } from 'angular2-text-mask';
import { TelInputComponent } from './tel-input.component';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'ng-select';


@NgModule({
  imports: [
    CommonModule,
	  TextMaskModule,
    FormsModule,
	  SelectModule
  ],
  declarations: [
    TelInputComponent
  ],
  exports: [
	  TelInputComponent
  ],
  providers: []
})
export class TelInputModule {
  static forRoot(): ModuleWithProviders {
    return {
      ngModule: TelInputModule,
      providers: []
    };
  }
}
