export type Recipient = {
  address: string;
  description?: string;
  firstName: string;
  lastName: string;
  occupation?: string;
  recipientId: string;
};

export type RecipientCreateInput = {
  address: string;
  description?: string;
  firstName: string;
  lastName: string;
  occupation?: string;
};

export type RecipientUpdateInput = {
  address: string;
  description?: string;
  firstName: string;
  lastName: string;
  occupation?: string;
  recipientId: string;
};
