import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {DataModelsComponent} from './data-models.component';
import {FC_NODE_COMPONENT_CONFIG, NgxFlowchartModule} from 'ngx-flowchart';
import {MatSidenavModule} from '@angular/material/sidenav';
import {SharedModule} from '@shared/shared.module';
import { ModelNodeDetailsAddFieldComponent } from './model-node-details/model-node-details-add-field/model-node-details-add-field.component';
import {ModelnodeComponent} from '@home/components/widget/lib/settings/data-models/model-node/modelnode.component';
import {
    ModelNodeDetailsComponent
} from '@home/components/widget/lib/settings/data-models/model-node-details/model-node-details.component';
import {
  AddModelNodeDialogComponent
} from '@home/components/widget/lib/settings/data-models/add-model-node-dialog.component';
import {
  AddModelEdgeDialogComponent
} from '@home/components/widget/lib/settings/data-models/add-model-edge-dialog.component';


@NgModule({
  imports: [
    CommonModule,
    NgxFlowchartModule,
    MatSidenavModule,
    SharedModule,
  ],
  declarations: [
    DataModelsComponent,
    AddModelNodeDialogComponent,
    ModelnodeComponent,
    ModelNodeDetailsComponent,
    ModelNodeDetailsAddFieldComponent,
    AddModelEdgeDialogComponent
  ],
  providers: [
    {
      provide: FC_NODE_COMPONENT_CONFIG,
      useValue: {
        nodeComponentType: ModelnodeComponent
      }
    }
  ],
  exports: [
    DataModelsComponent,
    ModelnodeComponent,
    ModelNodeDetailsComponent,
    ModelNodeDetailsAddFieldComponent
  ]
})
export class DataModelsWidgetsModule { }
