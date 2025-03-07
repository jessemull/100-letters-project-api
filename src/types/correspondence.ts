import { LetterInput } from './letters';
import { PersonInput } from './people';

export type CorrespondenceInput = {
  reason: string;
};

export type CreateOrUpdateCorrespondenceInput = {
  correspondence: CorrespondenceInput;
  person: PersonInput;
  letters: LetterInput[];
};

export type Correspondence = {
  correspondenceId: string;
  createdAt: string;
  personId: string;
  reason: string;
  updatedAt: string;
};
