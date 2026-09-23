import { Component } from "@angular/core";

@Component({
  selector: "demo-page",
  template: `
    @if (visible) {
      @for (item of items; track item.id) {
        <p>{{ item.name }}</p>
      }
    }
    <img src="inline.png">
  `,
})
export class AppComponent {
  visible = true;
  items = [{ id: 1, name: "one" }];
}
