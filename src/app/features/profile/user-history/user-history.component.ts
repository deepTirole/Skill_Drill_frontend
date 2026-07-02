import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-user-history',
  standalone: true,
  imports: [],
  templateUrl: './user-history.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserHistoryComponent {

}
