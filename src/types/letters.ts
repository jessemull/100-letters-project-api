interface Letter {
  letterId: string;
  imageUrl: string;
  correspondenceId: string;
  type: string;
  date: string;
  text: string;
  method?: string;
  status?: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
}

export { Letter };
