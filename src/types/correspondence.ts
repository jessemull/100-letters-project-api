import { LetterCreateInput, LetterUpdateInput } from './letters';
import { RecipientCreateInput, RecipientUpdateInput } from './recipients';

export enum Category {
  COMEDY = 'COMEDY',
  ENTERTAINMENT = 'ENTERTAINMENT',
  FAMILY = 'FAMILY',
  FOOD = 'FOOD',
  FRIENDS = 'FRIENDS',
  JOURNALISM = 'JOURNALISM',
  LITERATURE = 'LITERATURE',
  MENTORS = 'MENTORS',
  MUSIC = 'MUSIC',
  SCIENCE = 'SCIENCE',
  SPORTS = 'SPORTS',
  TECHNOLOGY = 'TECHNOLOGY',
}

export enum Status {
  COMPLETED = 'COMPLETED',
  PENDING = 'PENDING',
  RESPONDED = 'RESPONDED',
  UNSENT = 'UNSENT',
}

export type Reason = {
  category: Category;
  description: string;
};

export type Correspondence = {
  correspondenceId: string;
  createdAt: string;
  recipientId: string;
  reason: Reason;
  searchPartition: string;
  status: Status;
  title: string;
  updatedAt: string;
};

export type CorrespondenceCreateInput = {
  correspondence: {
    reason: Reason;
    status: Status;
    title: string;
  };
  letters: LetterCreateInput[];
  recipient: RecipientCreateInput;
};

export type CorrespondenceUpdateInput = {
  correspondence: {
    correspondenceId: string;
    reason: Reason;
    status: Status;
    title: string;
  };
  letters: LetterUpdateInput[];
  recipient: RecipientUpdateInput;
};
