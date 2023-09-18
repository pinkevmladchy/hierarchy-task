import {AfterViewInit, Component, OnInit} from '@angular/core';
import {FcNodeComponent, FlowchartConstants} from "ngx-flowchart";
import {DomSanitizer, SafeResourceUrl} from "@angular/platform-browser";
import {TranslateService} from "@ngx-translate/core";
import {Router} from "@angular/router";
import {ModelElementType} from "@home/components/widget/lib/settings/data-models/model-node.models";

@Component({
  selector: 'tb-modelnode',
  templateUrl: './modelnode.component.html',
  styleUrls: ['./modelnode.component.scss']
})
export class ModelnodeComponent extends FcNodeComponent implements OnInit, AfterViewInit {
  public iconsObj: {[key in ModelElementType]: string} = {
    [ModelElementType.TENANT]: 'person',
    [ModelElementType.CUSTOMER]: 'gpoup',
    [ModelElementType.ASSET]: 'business',
    [ModelElementType.DEVICE]: 'devices'
  };

  constructor(private sanitizer: DomSanitizer,
              private translate: TranslateService,
              private router: Router) {
    super();
  }

  ngOnInit(): void {
    super.ngOnInit();
  }

  ngAfterViewInit() {
    for (let i = 0; i < this.node.connectors.length; i++) {
      const connectorsRectInfo = this.modelservice.connectors.getConnectorRectInfo(this.node.connectors[i].id);

      connectorsRectInfo.nodeRectInfo.left = () => this.node.x + this.width / 2;
      connectorsRectInfo.nodeRectInfo.right = () => this.node.x + this.width / 2;

      if(this.node.connectors[i].type === FlowchartConstants.leftConnectorType) {
        connectorsRectInfo.nodeRectInfo.top = () => this.node.y + this.height / 2;
      } else {
        connectorsRectInfo.nodeRectInfo.top = () => this.node.y - this.height / 2;
      }

      this.modelservice.connectors.setConnectorRectInfo(this.node.connectors[i].id, connectorsRectInfo);
    }
  }

  public test(node: any) {
    console.log(node);
  }
}
