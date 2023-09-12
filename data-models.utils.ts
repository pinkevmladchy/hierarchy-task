import {AbstractControl, ValidationErrors, ValidatorFn} from '@angular/forms';

export const uniqueValueValidator = (uniqueArray: string[]): ValidatorFn => (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (uniqueArray.indexOf(value.trim()) !== -1) {
      return { uniqueValue: true };
    }
    return null;
  };
