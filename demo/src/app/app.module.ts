import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { TelInputModule } from 'ngx-tel-input';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    TelInputModule,
    FormsModule
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
