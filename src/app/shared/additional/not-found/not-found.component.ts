import {
  Component,
  inject,
  signal,
  ChangeDetectionStrategy,
} from "@angular/core";
import { Location } from "@angular/common";
import { Router, RouterLink } from "@angular/router";

@Component({
  selector: "app-not-found",
  standalone: true,
  imports: [RouterLink],
  templateUrl: "./not-found.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundComponent {
  private readonly location = inject(Location);
  private readonly router = inject(Router);

  readonly attemptedPath = signal(this.router.url);

  goBack(): void {
    this.location.back();
  }
}
