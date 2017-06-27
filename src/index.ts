import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TelInputDirective } from './tel-input.directive';

export * from "./tel-input.directive";

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    TelInputDirective
  ],
  exports: [
    TelInputDirective
  ]
})
export class TelInputModule {
  static forRoot(): ModuleWithProviders {
    return {
      ngModule: TelInputModule,
      providers: []
    };
  }
}
