export type PersonInput = {
  address: string;
  description?: string;
  firstName: string;
  lastName: string;
  occupation?: string;
};

export type Person = {
  address: string;
  description?: string;
  firstName: string;
  lastName: string;
  occupation?: string;
  personId: string;
};
