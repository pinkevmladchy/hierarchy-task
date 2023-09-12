import {ChangeDetectorRef, Component, Inject, OnInit, SkipSelf, ViewChild} from '@angular/core';
import {ErrorStateMatcher} from '@angular/material/core';
import {ModelNodeDetailsComponent} from './model-node-details/model-node-details.component';
import {AddModelNodeDialogData, FcModelNode} from './model-node.models';
import {Store} from '@ngrx/store';
import {Router} from '@angular/router';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {FormGroupDirective, NgForm, UntypedFormControl} from '@angular/forms';
import {AppState} from '@core/core.state';
import {DialogComponent} from '@shared/components/dialog.component';

@Component({
  selector: 'tb-add-model-node-dialog',
  templateUrl: 'add-model-node-dialog.component.html',
  providers: [{provide: ErrorStateMatcher, useExisting: AddModelNodeDialogComponent}],
  styleUrls: ['add-model-node-dialog.component.scss']
})

export class AddModelNodeDialogComponent extends DialogComponent<AddModelNodeDialogData>
  implements OnInit, ErrorStateMatcher {

  @ViewChild('tbModelNode', {static: true}) modelNodeDetailsComponent: ModelNodeDetailsComponent;

  modelNode: FcModelNode;
  modelNodesSavedNamesList: string[];

  submitted = false;

  constructor(protected store: Store<AppState>,
              protected router: Router,
              @Inject(MAT_DIALOG_DATA) public data: AddModelNodeDialogData,
              @SkipSelf() private errorStateMatcher: ErrorStateMatcher,
              private cdr: ChangeDetectorRef,
              public dialogRef: MatDialogRef<AddModelNodeDialogComponent>) {
    super(store, router, dialogRef);

    this.modelNode = this.data.modelNode;
    this.modelNodesSavedNamesList = this.data.modelNodesSavedNamesList;
  }

  ngOnInit(): void {}

  isErrorState(control: UntypedFormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    const originalErrorState = this.errorStateMatcher.isErrorState(control, form);
    const customErrorState = !!(control && control.invalid && this.submitted);
    return originalErrorState || customErrorState;
  }

  helpLinkIdForRuleNodeType(): string {
    //return getRuleNodeHelpLink(this.modelNode.component);
    return '';
  }

  cancel(): void {
    this.dialogRef.close(null);
  }

  save(): void {
    this.submitted = true;
    this.dialogRef.close(this.modelNode);
    this.cdr.markForCheck();
    //this.modelNodeDetailsComponent.validate();
    // if (this.ruleNodeDetailsComponent.ruleNodeFormGroup.valid) {
    //   this.dialogRef.close(this.modelNode);
    // }
  }
}
