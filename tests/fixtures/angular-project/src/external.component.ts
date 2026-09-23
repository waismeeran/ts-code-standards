import { Component, inject } from "@angular/core";
import { DataService } from "./service.js";

@Component({
  selector: "demo-external",
  templateUrl: "./external.component.html",
})
export class ExternalComponent {
  readonly data = inject(DataService);
  ngOnInit(): void {}
}
