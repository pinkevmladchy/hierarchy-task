import {ChangeDetectorRef, Component, Inject, OnInit, SkipSelf, ViewChild} from '@angular/core';
import {ErrorStateMatcher} from '@angular/material/core';
import {AddModelEdgeDialogData, ModelElementType} from './model-node.models';
import {Store} from '@ngrx/store';
import {Router} from '@angular/router';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {
  AbstractControl,
  FormGroupDirective,
  NgForm,
  UntypedFormBuilder,
  UntypedFormControl,
  UntypedFormGroup, ValidationErrors, ValidatorFn,
  Validators
} from '@angular/forms';
import {AppState} from '@core/core.state';
import {DialogComponent} from '@shared/components/dialog.component';
import {FcEdge} from 'ngx-flowchart';
import {of} from "rxjs";
import {uniqueValueValidator} from "@home/components/widget/lib/settings/data-models/data-models.utils";

@Component({
  selector: 'tb-add-model-edge-dialog',
  templateUrl: 'add-model-edge-dialog.component.html',
  providers: [{provide: ErrorStateMatcher, useExisting: AddModelEdgeDialogComponent}],
  styleUrls: ['add-model-edge-dialog.component.scss']
})

export class AddModelEdgeDialogComponent extends DialogComponent<AddModelEdgeDialogData>
  implements OnInit, ErrorStateMatcher {

  modelEdgeForm: UntypedFormGroup;

  modelEdge!: FcEdge;
  modelEdgesSavedNamesList!: string[];

  submitted = false;

  constructor(protected store: Store<AppState>,
              protected router: Router,
              private fb: UntypedFormBuilder,
              @Inject(MAT_DIALOG_DATA) public data: AddModelEdgeDialogData,
              @SkipSelf() private errorStateMatcher: ErrorStateMatcher,
              private cdr: ChangeDetectorRef,
              public dialogRef: MatDialogRef<AddModelEdgeDialogData>) {
    super(store, router, dialogRef);
  }

  ngOnInit(): void {
    this.modelEdgeForm = this.fb.group({});
    this.modelEdge = this.data.edge;
    this.modelEdgesSavedNamesList = this.data.modelEdgesSavedNamesList;
    this.buildForm();
  }

  isErrorState(control: UntypedFormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    const originalErrorState = this.errorStateMatcher.isErrorState(control, form);
    const customErrorState = !!(control && control.invalid && this.submitted);
    return originalErrorState || customErrorState;
  }

  helpLinkIdForRuleNodeType(): string {
    //return getRuleNodeHelpLink(this.modelNode.component);
    return '';
  }

  public onChangeModelEdgeName() {
    this.modelEdge.label = this.modelEdgeForm.value.label;
  }

  cancel(): void {
    this.dialogRef.close(null);
  }

  private buildForm() {
    this.modelEdgeForm = this.fb.group({
      label: [this.modelEdge.label, [Validators.required,
        Validators.pattern('(.|\\s)*\\S(.|\\s)*'), Validators.maxLength(255),
        uniqueValueValidator(this.modelEdgesSavedNamesList)
      ]]
    });
  }

  save(): void {
    this.submitted = true;
    this.dialogRef.close(this.modelEdge);
    this.cdr.markForCheck();
  }
}
