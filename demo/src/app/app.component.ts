import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  constructor(){}

  public countries = {
    'au': {
      name: 'Австралия',
      flag: 'au',
      mask: '+61-#-####-####'
    },
    'at' : {
      name : 'Австрия',
      flag : 'at',
      mask : '+43(###)###-####'
    }
  };

  public tel = '';
}
